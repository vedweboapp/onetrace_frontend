let draftIdSeq = 0;

export function newQuotationDraftId(prefix: string): string {
  draftIdSeq += 1;
  return `${prefix}-${Date.now().toString(36)}-${draftIdSeq.toString(36)}`;
}
