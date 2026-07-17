# Project design rules

- The homepage has one shared horizontal content axis. The header, hero, catalogue heading, essay list, and footer must all begin at the same left edge.
- Use the `--page-gutter` and `--page-width` tokens in `app/globals.css` for that axis. Do not introduce a nested centered `max-width` that shifts catalogue content inward.
- Keep the alignment regression test in `tests/rendered-html.test.mjs` whenever homepage layout CSS changes.
- Inside cards and panels, supporting text must share the component's left content edge. Do not center one supporting line while adjacent supporting lines are left-aligned.
