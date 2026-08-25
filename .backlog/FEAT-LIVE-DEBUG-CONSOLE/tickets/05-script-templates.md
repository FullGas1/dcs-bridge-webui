# 05 — script templates

**Status:** open (ready-for-agent)

## What to build

A shared library of named script templates, identical across every open widget. Each widget
gains a "memorize" action that prompts for a name and saves its current script text as a new
template, and a dropdown offering every saved template — selecting one loads its script into
that widget. Each dropdown entry has a delete icon that removes the template everywhere. Storage
reuses ticket 01's local, gitignored store (personal debug scripts — never versioned or shared).

## Acceptance criteria

- [ ] Saving a template from widget A prompts for a name, then makes it appear immediately in
      widget B's dropdown too, without a page reload.
- [ ] Selecting a template from the dropdown loads its script text into that widget's editor,
      replacing whatever was there.
- [ ] Deleting a template from the dropdown in one widget removes it from every other open
      widget's dropdown.
- [ ] Templates survive a backend restart (persisted in the local store) but are absent from
      `git status` — never staged.
- [ ] Saving two templates with the same name is either rejected with a clear message or treated
      as an overwrite — pick one behavior and make it consistent (no silent duplicate entries
      with the same name).

## Blocked by

- Ticket 03 (multi-widget grid and injection queue)
