import test from "node:test";
import assert from "node:assert/strict";
import { buildJobFormSubmissionFormData } from "./job-form-values.util";

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
