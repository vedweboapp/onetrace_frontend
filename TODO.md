- [ ] Explore pin list/location tabs table in `project-pins-list-tab.tsx` (and related components if needed)
- [ ] Add a new “Preview” column in the pin tables/grid for location tabs (pins per plot)
- [ ] Reuse existing `DrawingPinPreviewModal` by wiring a small clickable thumbnail/button that opens the modal with the already-existing preview data
- [ ] Generate a tiny preview (thumbnail-like) inside the table cell:
  - Prefer existing drawing thumbnail overlay logic if available
  - If not available, render a scaled drawing preview with pin marker overlay
- [ ] Adjust table grid column widths + header labels + row layout
- [ ] Ensure accessibility (button semantics, aria-label)
- [ ] Run typecheck/lint/build if available


