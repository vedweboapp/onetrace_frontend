export type ZohoConnectResponse = {
  new_connection?: boolean;
  connection_id?: number;
  authorization_url?: string;
};

export type ZohoCallbackParams = {
  code: string;
  state: string;
  accountsServer: string;
  pullHistoricalData: boolean;
};
