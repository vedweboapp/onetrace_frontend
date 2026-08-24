import assert from 'node:assert/strict';
import test from 'node:test';

// @ts-ignore
import { buildFieldRuleState } from './form-rules-engine.ts';

test('buildFieldRuleState resolves rule targets by stable field ids and f_id aliases', () => {
  const rules = [
    {
      _uid: 'rule-1',
      name: 'show child when parent selected',
      sequence: 1,
      field_id: 10,
      f_id: 10,
      condition: 'is',
      value: 'yes',
      output_fields: [{ field_api_name: 'child_name', field_id: 20, f_id: 20, action: 'show' }],
      rule_type: 'normal',
    },
  ] as any;

  const targetGroups = {
    '10': ['parent_name'],
    '20': ['child_name'],
    '__field__:10': ['parent_name'],
    '__field__:20': ['child_name'],
    'parent_name': ['parent_name'],
    'child_name': ['child_name'],
  } as any;

  const state = buildFieldRuleState(rules, { parent_name: 'yes' }, targetGroups);

  assert.equal(state.get('child_name')?.visible, true);
});

test('buildFieldRuleState allows chained section visibility to unlock a later field rule', () => {
  const rules = [
    {
      _uid: 'rule-section-2',
      name: 'show section 2 when status is yes',
      sequence: 1,
      field_api_name: 'status_1',
      condition: 'is',
      value: 'yes',
      output_fields: [{ field_api_name: '__section__:2', action: 'show' }],
      rule_type: 'normal',
    },
    {
      _uid: 'rule-number',
      name: 'show number when status in section 2 is yes',
      sequence: 2,
      field_api_name: 'status_2',
      condition: 'is',
      value: 'yes',
      output_fields: [{ field_api_name: 'number_field', action: 'show' }],
      rule_type: 'normal',
    },
  ] as any;

  const targetGroups = {
    '__section__:2': ['status_2', 'number_field', '__section__:2'],
    'status_2': ['status_2'],
    'number_field': ['number_field'],
    'status_1': ['status_1'],
  } as any;

  const state = buildFieldRuleState(rules, { status_1: 'yes', status_2: 'yes' }, targetGroups);

  assert.equal(state.get('__section__:2')?.visible, true);
  assert.equal(state.get('number_field')?.visible, true);
});

test('buildFieldRuleState resolves later advanced blocks after an earlier block reveals their section', () => {
  const rules = [
    {
      _uid: 'rule-advanced',
      name: 'show section then show field in it',
      sequence: 1,
      rule_type: 'advanced',
      blocks: [
        {
          _uid: 'block-1',
          field_api_name: 'choice',
          condition: 'is',
          value: 'yes',
          output_fields: [{ field_api_name: '__section__:2', action: 'show' }],
          else_blocks: [],
          else_output_fields: [],
        },
        {
          _uid: 'block-2',
          field_api_name: 'access',
          condition: 'is',
          value: 'yes',
          output_fields: [{ field_api_name: 'number_field', action: 'show' }],
          else_blocks: [],
          else_output_fields: [],
        },
      ],
    },
  ] as any;

  const targetGroups = {
    '__section__:2': ['access', 'number_field', '__section__:2'],
    'choice': ['choice'],
    'access': ['access'],
    'number_field': ['number_field'],
  } as any;

  const state = buildFieldRuleState(rules, { choice: 'yes', access: 'yes' }, targetGroups);

  assert.equal(state.get('__section__:2')?.visible, true);
  assert.equal(state.get('number_field')?.visible, true);
});

test('section rule targets support uid and sequence aliases for the same section', () => {
  const rules = [
    {
      _uid: 'rule-section',
      name: 'show section by uid target then reveal nested field',
      sequence: 1,
      field_api_name: 'choice',
      condition: 'is',
      value: 'yes',
      output_fields: [{ field_api_name: '__section__:section-abc-2', action: 'show' }],
      rule_type: 'normal',
    },
    {
      _uid: 'rule-field',
      name: 'show nested field after section is visible',
      sequence: 2,
      field_api_name: 'access',
      condition: 'is',
      value: 'yes',
      output_fields: [{ field_api_name: 'date', action: 'show' }],
      rule_type: 'normal',
    },
  ] as any;

  const targetGroups = {
    '__section__:section-abc-2': ['access', 'date', '__section__:section-abc-2', '__section__:2'],
    '__section__:2': ['access', 'date', '__section__:section-abc-2', '__section__:2'],
    choice: ['choice'],
    access: ['access'],
    date: ['date'],
  } as any;

  const state = buildFieldRuleState(rules, { choice: 'yes', access: 'yes' }, targetGroups);

  assert.equal(state.get('__section__:section-abc-2')?.visible, true);
  assert.equal(state.get('date')?.visible, true);
});

test('user scenario: showing section 2 should NOT show fields inside section 2 that have their own rules until condition is met', () => {
  const rules = [
    {
      _uid: 'rule-1',
      name: 'Rule 1',
      sequence: 1,
      rule_type: 'advanced',
      blocks: [
        {
          _uid: 'block-1',
          field_api_name: 'choice',
          condition: 'is',
          value: 'yes',
          output_fields: [{ field_api_name: '__section__:2', action: 'show' }],
          else_blocks: [],
        },
        {
          _uid: 'block-2',
          field_api_name: 'access',
          condition: 'is',
          value: 'yes',
          output_fields: [{ field_api_name: 'attachments', action: 'show' }],
          else_blocks: [],
        },
      ],
    },
  ] as any;

  const targetGroups = {
    '__section__:2': ['__section__:2'],
    'choice': ['choice'],
    'access': ['access'],
    'attachments': ['attachments'],
  } as any;

  const fieldToSectionMap = {
    'access': '__section__:2',
    'attachments': '__section__:2',
  };

  // Case 1: Choice is yes, but Access is empty. Section 2 should show, Attachments should NOT show!
  const state1 = buildFieldRuleState(rules, { choice: 'yes', access: '' }, targetGroups, fieldToSectionMap);
  assert.equal(state1.get('__section__:2')?.visible, true, 'Section 2 should be visible');
  assert.equal(state1.get('attachments')?.visible, false, 'Attachments should be hidden because Access is not yes');

  // Case 2: Choice is yes, Access is yes. Both Section 2 and Attachments should show!
  const state2 = buildFieldRuleState(rules, { choice: 'yes', access: 'yes' }, targetGroups, fieldToSectionMap);
  assert.equal(state2.get('__section__:2')?.visible, true, 'Section 2 should be visible');
  assert.equal(state2.get('attachments')?.visible, true, 'Attachments should be visible because Access is yes');

  // Case 3: Choice is no, Access is yes. Section 2 should be hidden, Attachments should be hidden!
  const state3 = buildFieldRuleState(rules, { choice: 'no', access: 'yes' }, targetGroups, fieldToSectionMap);
  assert.equal(state3.get('__section__:2')?.visible, false, 'Section 2 should be hidden');
  assert.equal(state3.get('attachments')?.visible, false, 'Attachments should be hidden because Section 2 is hidden');
});

test('complex multi-level section & field rule chaining with f_id and s_id', () => {
  const rules = [
    {
      _uid: 'rule-chain-1',
      name: 'Show Sec 2 when S1 is yes',
      sequence: 1,
      rule_type: 'normal',
      field_api_name: 's1_toggle',
      f_id: 'fid-s1',
      condition: 'is',
      value: 'yes',
      output_fields: [{ field_api_name: '__section__:sec-2', s_id: 'sec-2', action: 'show' }],
    },
    {
      _uid: 'rule-chain-2',
      name: 'Show Sec 3 when S2 field is yes',
      sequence: 2,
      rule_type: 'normal',
      field_api_name: 's2_toggle',
      f_id: 'fid-s2',
      condition: 'is',
      value: 'yes',
      output_fields: [{ field_api_name: '__section__:sec-3', s_id: 'sec-3', action: 'show' }],
    },
    {
      _uid: 'rule-chain-3',
      name: 'Require S3 field when S2 text is approved',
      sequence: 3,
      rule_type: 'advanced',
      blocks: [
        {
          _uid: 'block-3-1',
          field_api_name: 's2_text',
          f_id: 'fid-s2-txt',
          condition: 'is',
          value: 'approved',
          output_fields: [{ field_api_name: 's3_input', f_id: 'fid-s3-inp', action: 'require' }],
          else_blocks: [],
        },
      ],
    },
  ] as any;

  const targetGroups = {
    '__section__:sec-2': ['__section__:sec-2'],
    '__section__:sec-3': ['__section__:sec-3'],
    's1_toggle': ['s1_toggle'],
    '__field__:fid-s1': ['s1_toggle'],
    's2_toggle': ['s2_toggle'],
    '__field__:fid-s2': ['s2_toggle'],
    's2_text': ['s2_text'],
    '__field__:fid-s2-txt': ['s2_text'],
    's3_input': ['s3_input'],
    '__field__:fid-s3-inp': ['s3_input'],
  } as any;

  const fieldToSectionMap = {
    's1_toggle': '__section__:sec-1',
    's2_toggle': '__section__:sec-2',
    's2_text': '__section__:sec-2',
    's3_input': '__section__:sec-3',
  };

  // Step 1: Nothing toggled -> Sec 2 hidden, Sec 3 hidden, S3 input not required
  const s1 = buildFieldRuleState(rules, {}, targetGroups, fieldToSectionMap);
  assert.equal(s1.get('__section__:sec-2')?.visible, false);
  assert.equal(s1.get('__section__:sec-3')?.visible, false);

  // Step 2: s1_toggle = 'yes' -> Sec 2 visible, Sec 3 still hidden
  const s2 = buildFieldRuleState(rules, { s1_toggle: 'yes' }, targetGroups, fieldToSectionMap);
  assert.equal(s2.get('__section__:sec-2')?.visible, true);
  assert.equal(s2.get('__section__:sec-3')?.visible, false);

  // Step 3: s1_toggle = 'yes', s2_toggle = 'yes' -> Sec 2 and Sec 3 visible
  const s3 = buildFieldRuleState(rules, { s1_toggle: 'yes', s2_toggle: 'yes', s2_text: 'approved' }, targetGroups, fieldToSectionMap);
  assert.equal(s3.get('__section__:sec-2')?.visible, true);
  assert.equal(s3.get('__section__:sec-3')?.visible, true);
  assert.equal(s3.get('s3_input')?.required, true);

  // Step 4: s1_toggle = 'no', but s2_toggle='yes' and s2_text='approved' -> Sec 2 is hidden, Sec 3 should be hidden, S3 input should not be required!
  const s4 = buildFieldRuleState(rules, { s1_toggle: 'no', s2_toggle: 'yes', s2_text: 'approved' }, targetGroups, fieldToSectionMap);
  assert.equal(s4.get('__section__:sec-2')?.visible, false);
  assert.equal(s4.get('__section__:sec-3')?.visible, false);
  assert.equal(s4.get('s3_input')?.required ?? false, false);
});

test('buildFieldRuleState correctly targets sections via s_id and __section__: alias outputs', () => {
  const rules = [
    {
      _uid: 'rule-sec',
      name: 'show section 2 when access is Yes',
      sequence: 1,
      rule_type: 'advanced',
      blocks: [
        {
          _uid: 'b-1',
          field_api_name: '__field__:743',
          f_id: '743',
          api_name: 'access',
          condition: 'is',
          value: 'Yes',
          output_fields: [
            {
              field_api_name: '__section__:172',
              s_id: '172',
              section_id: '172',
              section_name: 'Door Leaf',
              target_type: 'section',
              action: 'show',
            },
          ],
        },
      ],
    },
  ] as any;

  const targetGroups = {
    '__field__:743': ['access'],
    '743': ['access'],
    'access': ['access'],
    '__section__:172': ['__section__:172'],
    '172': ['__section__:172'],
  };

  const hiddenState = buildFieldRuleState(rules, { access: 'No' }, targetGroups);
  assert.equal(hiddenState.get('__section__:172')?.visible, false);

  const visibleState = buildFieldRuleState(rules, { access: 'Yes' }, targetGroups);
  assert.equal(visibleState.get('__section__:172')?.visible, true);
});

test('normalizeConditionValue supports exact option strings containing commas', () => {
  const rules = [
    {
      _uid: 'rule-comma-opt',
      name: 'Show photos when long picklist option with comma is selected',
      sequence: 1,
      rule_type: 'advanced',
      blocks: [
        {
          _uid: 'block-comma',
          field_api_name: '__field__:564',
          f_id: '1787218181727',
          api_name: 'does_the_hold_open_device_release_the_door_when_required?',
          condition: 'is',
          value: 'It is not possible to confirm, as the hold open device is activated by the fire alarm system',
          output_fields: [
            {
              field_api_name: '__field__:568',
              f_id: '1787218364814',
              action: 'show',
            },
          ],
        },
      ],
    },
  ] as any;

  const targetGroups = {
    '__field__:564': ['1787218181727'],
    '1787218181727': ['1787218181727'],
    'does_the_hold_open_device_release_the_door_when_required?': ['1787218181727'],
    '__field__:568': ['1787218364814'],
    '1787218364814': ['1787218364814'],
  };

  // Trigger matches exact string with comma
  const stateMatched = buildFieldRuleState(
    rules,
    {
      'does_the_hold_open_device_release_the_door_when_required?':
        'It is not possible to confirm, as the hold open device is activated by the fire alarm system',
    },
    targetGroups
  );
  assert.equal(stateMatched.get('1787218364814')?.visible, true);

  // When not matched -> hidden
  const stateUnmatched = buildFieldRuleState(
    rules,
    {
      'does_the_hold_open_device_release_the_door_when_required?': 'No',
    },
    targetGroups
  );
  assert.equal(stateUnmatched.get('1787218364814')?.visible, false);
});


