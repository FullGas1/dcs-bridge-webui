"""Lua source for serializing a Lua table into a literal, re-executable Lua expression.

Ticket 01 of FEAT-TABLE-RETURN-SERIALIZATION (see .backlog/). This module owns only the Lua
*source text* — it runs inside the DCS mission, not in this process. Ticket 02 embeds it into
the preamble that wraps an injected script (see ADR 0004: the rewrite must happen before
dcs-bridge.lua's tostring() destroys the table's structure, which this process never sees).

Every statement ends in `;` so ticket 02 can safely collapse this source onto a single physical
line (joining with spaces, never deleting them) without gluing two tokens together - the single-
line constraint keeps the line-number shift this preamble introduces constant and predictable.
"""

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
