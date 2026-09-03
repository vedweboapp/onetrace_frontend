import test from "node:test";
import assert from "node:assert/strict";
// @ts-ignore
import { buildJobFormSubmissionFormData } from "./job-form-values.util.ts";

test("buildJobFormSubmissionFormData includes file_upload values from data URLs on first submit", () => {
  const sections = [
    {
      is_subform: false,
      fields: [
        {
          id: 101,
          api_name: "attachment",
          field_label: "Attachment",
          field_type: "file_upload",
        },
      ],
    },
  ];

  const fd = buildJobFormSubmissionFormData(
    77,
    { attachment: "data:application/pdf;base64,JVBERi0xLjQK" },
    sections as any,
    { status: "submitted", defaultValues: { attachment: "" } },
  );

  const fileValueEntries = Array.from(fd.entries()).filter(
    ([key]) => key === "values[0][value]",
  );

  assert.equal(fileValueEntries.length, 1, "expected the file upload to be appended as a binary payload entry");
  assert.equal(fd.get("values[0][field_id]"), "101");
  assert.equal(fd.get("values[0][field_type]"), "file_upload");
  assert.ok(fd.get("values[0][value]") instanceof File, "expected a File object to be appended");
});

test("buildJobFormSubmissionFormData includes an explicit empty file_upload entry when field is absent on first submit", () => {
  const sections = [
    {
      is_subform: false,
      fields: [
        {
          id: 102,
          api_name: "attachment",
          field_label: "Attachment",
          field_type: "file_upload",
        },
      ],
    },
  ];

  const fd = buildJobFormSubmissionFormData(
    77,
    {},
    sections as any,
    { status: "submitted", defaultValues: { attachment: "" } },
  );

  assert.equal(fd.get("values[0][field_id]"), "102");
  assert.equal(fd.get("values[0][field_type]"), "file_upload");
  assert.equal(fd.get("values[0][value]"), "");
});

test("buildJobFormSubmissionFormData correctly appends multiple images array as multipart binary files without corrupting JSON values", () => {
  const sections = [
    {
      is_subform: false,
      fields: [
        {
          id: 38,
          api_name: "photos",
          field_label: "Multiple Images",
          field_type: "multi_image_upload",
        },
        {
          id: 183,
          api_name: "name",
          field_label: "Name",
          field_type: "single_line",
        },
      ],
    },
  ];

  const img1 = new File(["abc"], "photo1.png", { type: "image/png" });
  const img2 = new File(["def"], "photo2.png", { type: "image/png" });

  const fd = buildJobFormSubmissionFormData(
    88,
    {
      photos: [img1, img2],
      name: "John Doe",
    },
    sections as any,
    { status: "submitted", defaultValues: { photos: [], name: "" } },
  );

  // The values JSON should ONLY contain the non-file field "name"
  const valuesRaw = fd.get("values");
  assert.ok(valuesRaw != null);
  const parsed = JSON.parse(valuesRaw as string);
  assert.deepEqual(parsed, [{ field_id: 183, value: "John Doe" }]);

  // The photos should be appended as binary entries: values[1] and values[2]
  assert.equal(fd.get("values[1][field_id]"), "38");
  assert.equal(fd.get("values[1][field_type]"), "multi_image_upload");
  assert.ok(fd.get("values[1][value]") instanceof File);

  assert.equal(fd.get("values[2][field_id]"), "38");
  assert.equal(fd.get("values[2][field_type]"), "multi_image_upload");
  assert.ok(fd.get("values[2][value]") instanceof File);
});

