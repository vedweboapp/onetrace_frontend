"use client";

import React, { useEffect, useState } from "react";
import OrganizationalDetail, { OrganizationalDetailRef } from "./organizational-detail";
import CompanySettingsHeader from "./company-settings-header";
import CompanySettingsCurrency from "./company-settings-currency";
import CompanySettingSchedule from "./company-setting-schedule";
import { getOrganizationDetails } from "../api/company-settings.api";
import { OrganizationDetails } from "../types/types";
import { useSettingsPageTab } from "@/shared/hooks/use-settings-page-tab";

const COMPANY_TABS = [
  { id: "organization", label: "ORGANIZATION DETAILS" },
  { id: "currencies", label: "CURRENCIES" },
  { id: "schedule", label: "SCHEDULE" },
] as const;

const defaultOrgDetails: OrganizationDetails = {
  id: 1,
  logo: "",
  name: "OneTrace",
  size: "1-10",
  description: "Company details",
  website: "https://onetrace.com",
  timezone: "UTC",
  street: "",
  street2: "",
  city: "",
  state: "",
  zip: "",
  country: "",
  currencyCode: "INR",
  currencyName: "Indian Rupee",
  formatType: "symbol",
  symbol: "₹",
  symbolPosition: "before",
  digitSeparator: "1,234,567.89",
  decimalPlaces: 2,
  numberFormat: "1,234,567.89",
  startTime: "09:00",
  endTime: "17:00",
  workingDays: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
  breakDuration: "30 minutes",
};

const CompanySettingsDetails = () => {
  const orgDetailRef = React.useRef<OrganizationalDetailRef>(null);
  const { activeTab, setTab } = useSettingsPageTab("organization");

  const [isEditing, setIsEditing] = useState(false);
  const [orgDetails, setOrgDetails] = useState<OrganizationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchOrgDetails = async () => {
    try {
      setIsLoading(true);
      const data = await getOrganizationDetails(1);
      setOrgDetails(data);
    } catch (error) {
      console.error("Failed to fetch organization details, using fallback details:", error);
      setOrgDetails(defaultOrgDetails);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void fetchOrgDetails();
  }, []);

  useEffect(() => {
    setIsEditing(false);
  }, [activeTab]);

  const handleTabChange = (next: string) => {
    if (next === activeTab) return;
    setIsEditing(false);
    setTab(next);
  };

  const handleUpdateSuccess = (updatedData?: OrganizationDetails) => {
    if (updatedData) {
      setOrgDetails(updatedData);
    } else {
      void fetchOrgDetails();
    }
    setIsEditing(false);
  };

  const renderTabContent = () => {
    if (isLoading) {
      return (
        <div className="flex w-full items-center justify-center p-20">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      );
    }

    if (!orgDetails) return null;

    switch (activeTab) {
      case "currencies":
        return (
          <CompanySettingsCurrency
            key={`currency-${orgDetails.id}`}
            initialData={orgDetails}
            onSaveSuccess={handleUpdateSuccess}
          />
        );
      case "schedule":
        return (
          <CompanySettingSchedule
            key={`schedule-${orgDetails.id}`}
            initialData={orgDetails}
            onSaveSuccess={handleUpdateSuccess}
          />
        );
      case "organization":
      default:
        return (
          <OrganizationalDetail
            key={`org-${orgDetails.id}`}
            ref={orgDetailRef}
            isEditing={isEditing}
            initialData={orgDetails}
            onSaveSuccess={handleUpdateSuccess}
          />
        );
    }
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <CompanySettingsHeader
        tabs={[...COMPANY_TABS]}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        isEditing={isEditing}
        setIsEditing={setIsEditing}
        onSave={() => orgDetailRef.current?.submit()}
        showEdit={activeTab === "organization"}
      />
      {renderTabContent()}
    </div>
  );
};

export default CompanySettingsDetails;
