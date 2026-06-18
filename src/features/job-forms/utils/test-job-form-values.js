// Copy of the functions we want to test

const FILE_FIELD_TYPES = new Set(["signature", "file_upload", "image_upload", "file"]);

function serializeFieldValue(value) {
  if (value == null || value === "") return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (Array.isArray(value)) return JSON.stringify(value);
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function areValuesEqual(a, b) {
  if (a === b) return true;
  const aEmpty = a === undefined || a === null || a === "";
  const bEmpty = b === undefined || b === null || b === "";
  if (aEmpty && bEmpty) return true;
  if (aEmpty !== bEmpty) return false;
  
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    return a.every((v, i) => areValuesEqual(v, b[i]));
  }
  if (a && typeof a === "object" && b && typeof b === "object") {
    const ka = Object.keys(a);
    const kb = Object.keys(b);
    if (ka.length !== kb.length) return false;
    return ka.every((k) => areValuesEqual(a[k], b[k]));
  }
  return false;
}

function mapFormDataToSubmissionValues(formData, sections, defaultValues) {
  const out = [];

  for (const section of sections) {
    if (section.is_subform) continue;
    for (const field of section.fields) {
      if (field.id == null || !field.api_name) continue;
      if (!(field.api_name in formData)) continue;

      const raw = formData[field.api_name];
      const initial = defaultValues?.[field.api_name];

      if (FILE_FIELD_TYPES.has(field.field_type)) continue;
      if (typeof File !== "undefined" && raw instanceof File) continue;

      if (areValuesEqual(raw, initial)) {
        continue;
      }

      out.push({
        field_id: field.id,
        value: serializeFieldValue(raw),
      });
    }
  }

  return out;
}

function buildJobFormSubmissionFormData(jobFormId, formData, sections, extra) {
  const values = mapFormDataToSubmissionValues(formData, sections, extra?.defaultValues);

  const fd = new FormData();
  fd.append("job_form_id", String(jobFormId));
  fd.append("status", extra?.status ?? "submitted");
  if (extra?.remarks != null) {
    fd.append("remarks", extra.remarks);
  }
  
  if (values.length > 0) {
    fd.append("values", JSON.stringify(values));
  }

  let fileIndex = values.length;
  for (const section of sections) {
    if (section.is_subform) continue;
    for (const field of section.fields) {
      if (!field.api_name || field.id == null) continue;
      if (!(field.api_name in formData)) continue;

      const val = formData[field.api_name];
      if (typeof File !== "undefined" && val instanceof File) {
        fd.append(`values[${fileIndex}][field_id]`, String(field.id));
        fd.append(`values[${fileIndex}][field_type]`, field.field_type ?? "file");
        fd.append(`values[${fileIndex}][value]`, val, val.name);
        fileIndex++;
      } else if (FILE_FIELD_TYPES.has(field.field_type)) {
        const hasExistingFile =
          typeof extra?.defaultValues?.[field.api_name] === "string" &&
          extra.defaultValues[field.api_name] !== "";
        if (hasExistingFile && (val === null || val === "" || val === undefined)) {
          fd.append(`values[${fileIndex}][field_id]`, String(field.id));
          fd.append(`values[${fileIndex}][field_type]`, field.field_type ?? "file");
          fd.append(`values[${fileIndex}][is_deleted]`, "true");
          fileIndex++;
        }
      }
    }
  }

  return fd;
}

// Mock Sections
const mockSections = [
  {
    name: "General Info",
    column_count: 1,
    is_subform: false,
    fields: [
      {
        id: 101,
        api_name: "name",
        field_label: "Name",
        field_type: "single_line",
        required: true,
      },
      {
        id: 102,
        api_name: "description",
        field_label: "Description",
        field_type: "multi_line",
        required: false,
      },
      {
        id: 103,
        api_name: "attachment",
        field_label: "Attachment",
        field_type: "file_upload",
        required: false,
      },
      {
        id: 104,
        api_name: "signature_field",
        field_label: "Signature",
        field_type: "signature",
        required: true,
      },
    ],
  },
];

// Mock File class
class MockFile {
  constructor(name) {
    this.name = name;
  }
}
global.File = MockFile;

// Mock FormData
class MockFormData {
  constructor() {
    this.data = new Map();
  }
  append(key, val, filename) {
    if (!this.data.has(key)) {
      this.data.set(key, []);
    }
    this.data.get(key).push(val);
  }
  get(key) {
    return this.data.get(key)?.[0];
  }
  keys() {
    return Array.from(this.data.keys());
  }
}
global.FormData = MockFormData;

function runTests() {
  console.log("Running updated payload tests...");

  // Test 1: Cleared non-required field (was `"hello"`, now `""`) should be included
  // But unchanged / already empty fields (e.g. description was `""`, now `""`) should NOT be included
  const defaultValues = {
    name: "John Doe",
    description: "", // already empty
  };

  const formData1 = {
    name: "John Doe",       // unchanged
    description: "",        // already empty, unchanged
  };

  const values1 = mapFormDataToSubmissionValues(formData1, mockSections, defaultValues);
  console.log("Test 1 - values array (all unchanged):", values1);

  if (values1.length === 0) {
    console.log("✅ Test 1 Passed: Unchanged fields are not included in values array.");
  } else {
    console.error("❌ Test 1 Failed: Unchanged fields should not be included.");
  }

  // Test 2: Field cleared from a value (was `"hello"`, now `""`)
  const defaultValues2 = {
    name: "John Doe",
    description: "hello", // was populated
  };

  const formData2 = {
    name: "John Doe",
    description: "", // cleared!
  };

  const values2 = mapFormDataToSubmissionValues(formData2, mockSections, defaultValues2);
  console.log("Test 2 - values array (description cleared):", values2);

  const hasDescription = values2.some(v => v.field_id === 102 && v.value === "");
  const hasName = values2.some(v => v.field_id === 101); // name is unchanged

  if (hasDescription && !hasName && values2.length === 1) {
    console.log("✅ Test 2 Passed: Cleared field is included, unchanged name is skipped.");
  } else {
    console.error("❌ Test 2 Failed!");
  }

  // Test 3: If values array is empty (e.g., only file changes), the values key should NOT be included in FormData
  const defaultValues3 = {
    name: "John Doe",
    description: "",
    attachment: "https://example.com/existing_file.jpg",
  };

  const formData3 = {
    attachment: "", // cleared existing file
  };

  const fd = buildJobFormSubmissionFormData(
    12,
    formData3,
    mockSections,
    { status: "submitted", defaultValues: defaultValues3 }
  );

  const keys = fd.keys();
  console.log("Test 3 - FormData keys:", keys);

  const hasValuesKey = keys.includes("values");
  const dataMap = fd.data;
  let attachmentDeleted = false;

  for (const [key, vals] of dataMap.entries()) {
    const idMatch = key.match(/^values\[(\d+)\]\[field_id\]$/);
    if (idMatch) {
      const idx = idMatch[1];
      const fieldIdStr = vals[0];
      if (fieldIdStr === "103") {
        const isDeleted = dataMap.get(`values[${idx}][is_deleted]`)?.[0];
        if (isDeleted === "true") {
          attachmentDeleted = true;
        }
      }
    }
  }

  if (!hasValuesKey && attachmentDeleted) {
    console.log("✅ Test 3 Passed: 'values' key is NOT appended when values is empty. Deletion entry exists.");
  } else {
    console.error(`❌ Test 3 Failed: hasValuesKey=${hasValuesKey}, attachmentDeleted=${attachmentDeleted}`);
  }
}

runTests();
