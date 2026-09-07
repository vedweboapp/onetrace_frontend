import {
  mapFormDataToSubmissionValues,
  buildJobFormSubmissionFormData,
} from "./job-form-values.util";

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

// Mock File class if we run in Node.js
if (typeof global.File === "undefined") {
  class MockFile {
    name: string;
    constructor(name: string) {
      this.name = name;
    }
  }
  (global as any).File = MockFile;
}

// Mock FormData if we run in Node.js
if (typeof global.FormData === "undefined") {
  class MockFormData {
    data = new Map<string, any[]>();
    append(key: string, val: any, filename?: string) {
      if (!this.data.has(key)) {
        this.data.set(key, []);
      }
      this.data.get(key)!.push(val);
    }
    get(key: string) {
      return this.data.get(key)?.[0];
    }
    keys() {
      return Array.from(this.data.keys());
    }
  }
  (global as any).FormData = MockFormData;
}

function runTests() {
  console.log("Running updated payload tests...");

  // Test 1: Cleared non-required field (was `"hello"`, now `""`) should be included
  // But unchanged / already empty fields (e.g. description was `""`, now `""`) should NOT be included
  const defaultValues = {
    name: "John Doe",
    description: "", // already empty
  };

  const formData1 = {
    name: "John Doe",       // untouched/unchanged under changesOnly, but present in formData
    description: "",        // already empty, untouched/unchanged
  };

  const values1 = mapFormDataToSubmissionValues(formData1, mockSections as any, defaultValues);
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

  const values2 = mapFormDataToSubmissionValues(formData2, mockSections as any, defaultValues2);
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
    mockSections as any,
    { status: "submitted", defaultValues: defaultValues3 }
  );

  const keys = (fd as any).keys();
  console.log("Test 3 - FormData keys:", keys);

  const hasValuesKey = keys.includes("values");
  const dataMap = (fd as any).data as Map<string, any[]>;
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
