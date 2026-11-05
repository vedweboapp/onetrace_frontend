import type { Client } from "@/features/clients/types/client.types";
import type { CheckmarkSelectOption } from "@/shared/ui/checkmark-select";

export function clientToSelectOption(client: Client): CheckmarkSelectOption {
  const name = (client.name ?? "").trim();
  return { value: String(client.id), label: name || `Client #${client.id}` };
}

export function clientsToSelectOptions(clients: Client[]): CheckmarkSelectOption[] {
  return clients.map(clientToSelectOption);
}
