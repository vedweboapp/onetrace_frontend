Will implement Preview column in `src/features/projects/components/project-pins-list-tab.tsx`.

Approach:
- Extend `PIN_TABLE_GRID` to include a new column for preview thumbnail.
- Update `ProjectPinTableHeader` to render header label “Preview”.
- Update `ProjectPinRow` to render a small clickable thumbnail.
  - Use `DrawingFilePreview` (with widthPx small) + `DrawingPinThumbnailOverlay`.
  - Need drawing file type: currently we only have pin + level.drawing_file in outer component.
  - So in `onPreviewPin`, already passes previewPinData including drawingFile and drawingName; for thumbnail we’ll still need `level.drawing_file` inside row -> pass it down into `PlotPinsBlock` and `ProjectPinRow`.

Implementation steps:
1) Import `DrawingFilePreviewFill` and `DrawingPinThumbnailOverlay`.
2) In `PlotPinsBlock` props add `drawingFile: string | undefined` and `drawingName: string` (or keep drawingFile).
3) In `ProjectPinRow`, add prop `drawingFile?: string`.
4) Render preview cell as button with aria-label.
5) Update grid column widths (add one more column at end or before actions).
6) Ensure click does not toggle selection checkbox.

Todo: adjust CSS grid column order consistently for header + row.
