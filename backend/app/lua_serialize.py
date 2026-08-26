"""Serializes a table return value into literal Lua, by rewriting the injected code itself.

ADR 0004: dcs-bridge.lua stringifies every exec result with tostring() before this process ever
sees it, so a table's structure is already destroyed by the time a response reaches here. The
fix has to run inside the DCS mission, before that tostring() - hence wrap_injection() rewrites
the code sent to dcs-serve rather than post-processing its response.

Every SERIALIZER_LUA statement ends in `;` so it can be safely collapsed onto a single physical
line (joining with spaces, never deleting them) without gluing two tokens together. wrap_injection
relies on this: everything preceding the user's own code is kept to exactly one physical line, so
wrapping always shifts reported error line numbers by exactly +1 - correct_error_line_numbers()
shifts them back before an error message reaches the frontend.
"""
import re

SERIALIZER_LUA = """\
local __wuiReserved = {
    ["and"]=true,["break"]=true,["do"]=true,["else"]=true,["elseif"]=true,["end"]=true,
    ["false"]=true,["for"]=true,["function"]=true,["if"]=true,["in"]=true,["local"]=true,
    ["nil"]=true,["not"]=true,["or"]=true,["repeat"]=true,["return"]=true,["then"]=true,
    ["true"]=true,["until"]=true,["while"]=true,
};
local function __wuiIsIdent(s)
    return type(s) == "string" and s:match("^[%a_][%w_]*$") ~= nil and not __wuiReserved[s];
end;
local function __wuiEscape(s)
    local out = s:gsub("\\\\", "\\\\\\\\");
    out = out:gsub("\\"", "\\\\\\"");
    out = out:gsub("\\n", "\\\\n");
    out = out:gsub("\\r", "\\\\r");
    out = out:gsub("\\t", "\\\\t");
    out = out:gsub("%c", function(c) return string.format("\\\\%d", string.byte(c)) end);
    return "\\"" .. out .. "\\"";
end;
local function __wuiScalar(v)
    local t = type(v);
    if t == "string" then return __wuiEscape(v);
    elseif t == "number" then return string.format("%.14g", v);
    elseif t == "boolean" then return tostring(v);
    else return "\\"<" .. t .. ">\\""; end;
end;
local function __wuiIsSeq(t)
    local count = 0;
    for _ in pairs(t) do count = count + 1; end;
    if count == 0 then return true, 0; end;
    for i = 1, count do
        if t[i] == nil then return false, count; end;
    end;
    return true, count;
end;
local function __wuiSerialize(t, depth, visited, budget)
    if visited[t] then return "\\"<circular reference>\\""; end;
    if depth > 10 then return "\\"<max depth reached>\\""; end;
    visited[t] = true;
    local seq, n = __wuiIsSeq(t);
    local parts = {};
    local truncated = false;
    if seq then
        for i = 1, n do
            if budget.left <= 0 then truncated = true; break; end;
            budget.left = budget.left - 1;
            local v = t[i];
            if type(v) == "table" then
                parts[#parts+1] = __wuiSerialize(v, depth + 1, visited, budget);
            else
                parts[#parts+1] = __wuiScalar(v);
            end;
        end;
    else
        local keys = {};
        for k in pairs(t) do keys[#keys+1] = k; end;
        table.sort(keys, function(a, b)
            if type(a) == type(b) and (type(a) == "number" or type(a) == "string") then
                return a < b;
            end;
            return tostring(a) < tostring(b);
        end);
        for _, k in ipairs(keys) do
            if budget.left <= 0 then truncated = true; break; end;
            budget.left = budget.left - 1;
            local v = t[k];
            local keyText;
            if __wuiIsIdent(k) then keyText = k .. " = ";
            else keyText = "[" .. __wuiScalar(k) .. "] = "; end;
            if type(v) == "table" then
                parts[#parts+1] = keyText .. __wuiSerialize(v, depth + 1, visited, budget);
            else
                parts[#parts+1] = keyText .. __wuiScalar(v);
            end;
        end;
    end;
    visited[t] = nil;
    local indent = string.rep("    ", depth);
    local closeIndent = string.rep("    ", depth - 1);
    if #parts == 0 and not truncated then return "{}"; end;
    local body = indent .. table.concat(parts, ",\\n" .. indent);
    if truncated then
        body = body .. ",\\n" .. indent .. "-- truncated: more entries";
    end;
    return "{\\n" .. body .. "\\n" .. closeIndent .. "}";
end;
function __dcsBridgeWebuiSerialize(t)
    return __wuiSerialize(t, 1, {}, { left = 1000 });
end;
"""

# Windows checkouts of this repo normalize line endings to CRLF (core.autocrlf) - the source
# above must stay CRLF-free regardless of how the .py file itself is stored on disk.
SERIALIZER_LUA = SERIALIZER_LUA.replace("\r\n", "\n")

# Collapsed onto one physical line (see module docstring) so it can sit ahead of the user's code
# without disturbing the constant +1 line-number shift wrap_injection relies on.
_SERIALIZER_ONE_LINE = " ".join(SERIALIZER_LUA.splitlines())

_LINE_REF_RE = re.compile(r'(\[string "[^"]*"\]:)(\d+):')


def wrap_injection(code: str) -> str:
    """Builds the Lua text actually sent to dcs-serve for a widget's injection: the user's
    `code` runs verbatim inside an immediately-invoked function; if its result is a table, the
    bootstrapped-once serializer turns it into literal Lua before dcs-bridge.lua's tostring()
    ever sees it. Any other return value (string/number/boolean/nil) passes through unchanged.

    Everything ahead of `code` is exactly one physical line, so `code` always starts at line 2
    of the text sent - see correct_error_line_numbers()."""
    preamble = (
        f"if not _G.__dcsBridgeWebuiSerialize then {_SERIALIZER_ONE_LINE} end;"
        "local __r=(function()"
    )
    epilogue = (
        '\nend)();if type(__r)=="table" then return __dcsBridgeWebuiSerialize(__r) '
        "else return __r end"
    )
    return f"{preamble}\n{code}{epilogue}"


def correct_error_line_numbers(message: str) -> str:
    """wrap_injection() always adds exactly one line ahead of the user's own code, so a
    dcs-bridge.lua error report (`[string "..."]:N: message`) is always off by +1 relative to
    the line the user actually wrote. Shifts any such reference back by 1 (floored at 1) before
    the message reaches the frontend."""
    def _shift(m: "re.Match[str]") -> str:
        return f"{m.group(1)}{max(int(m.group(2)) - 1, 1)}:"

    return _LINE_REF_RE.sub(_shift, message)
