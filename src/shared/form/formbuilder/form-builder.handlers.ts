/**
 * Context passed to every injected handler so handlers have access to
 * routing/purpose metadata without needing to read from the URL themselves.
 */
export interface HandlerContext {
  purpose: string | null;
  rawPurpose?: string | null;
  targetModule: string;
  resolvedLayoutId?: string | number;
  /** The project-type route id, only populated for create_project_form flows */
  projectTypeId?: string;
  /** The installation-type id, only populated for create_project_form flows */
  installationTypeId?: string;
}

/**
 * Injectable API handler contract for FormBuilder.
 *
 * Consumers that need a custom API flow (e.g. project forms) implement this
 * interface and pass it to <FormBuilder apiHandlers={...} />.
 *
 * All methods are optional except `createForm` — omitted handlers cause the
 * builder to fall back to its default behaviour for that operation.
 */
export interface FormBuilderApiHandlers {
  /** Fetch the form schema. Omit to use the default module-schema fetch. */
  fetchSchema?: (context: HandlerContext) => Promise<any>;

  /** Create a brand-new form. Required for any injection to be meaningful. */
  createForm: (payload: any, context: HandlerContext) => Promise<any>;

  /** Update an existing form. */
  updateForm?: (
    id: string | number,
    payload: any,
    context: HandlerContext,
  ) => Promise<any>;

  /** Fetch an existing form by id. */
  fetchForm?: (id: string | number, context: HandlerContext) => Promise<any>;

  /**
   * Post rules for a form after it has been created.
   * Called automatically after a successful `createForm` when rules exist.
   */
  createRules?: (
    formId: string | number,
    rules: any[],
    context: HandlerContext,
  ) => Promise<any>;

  /**
   * Post sections for a form after it has been created.
   * Called automatically after a successful `createForm`.
   */
  createSections?: (
    formId: string | number,
    sections: any,
    context: HandlerContext,
  ) => Promise<any>;
}
