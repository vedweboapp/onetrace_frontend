"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { X, ChevronDown, Check, Search, CircleSlash, User } from "lucide-react";
import { FieldError } from "react-hook-form";
import { fetchUsersPage, fetchUserProfile } from "@/features/users/api/user.api";
import { UserProfile } from "@/features/users/types/user.types";

export interface UsersSelectProps {
  label?: string | React.ReactNode;
  name: string;
  value?: number | number[]; // Can be single ID or array of IDs
  onChange: (value: number | number[] | null) => void;
  errors?: FieldError;
  placeholder?: string;
  readOnly?: boolean;
  className?: string;

  userType?: "single" | "multiple";
  // Nested prop (from saved API response via field.properties)
  properties?: {
    is_required?: boolean;
    is_searchable?: boolean;
    is_filterable?: boolean;
    is_sortable?: boolean;
    is_public?: boolean;
    validation_rules?: {
      user_type?: "single" | "multiple";
      [key: string]: any;
    };
    [key: string]: any;
  };
}

const UsersSelect = React.forwardRef<HTMLDivElement, UsersSelectProps>(
  (
    {
      label,
      name,
      value,
      onChange,
      errors,
      placeholder,
      readOnly = false,
      className = "",
      userType,
      properties,
    },
    ref
  ) => {
    // 1. Determine selection mode:
    //    - Check direct userType prop first (flat field config from builder preview)
    //    - Fall back to properties.validation_rules.user_type (from saved API response)
    const resolvedUserType =
      userType ??
      properties?.validation_rules?.user_type ??
      properties?.user_type;
    const isSingle = resolvedUserType === "single";
    const defaultPlaceholder = isSingle ? "Select a user..." : "Select users...";
    const displayPlaceholder = placeholder || defaultPlaceholder;

    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [usersList, setUsersList] = useState<UserProfile[]>([]);
    const [loading, setLoading] = useState(false);
    const [resolvedUsers, setResolvedUsers] = useState<Record<number, UserProfile>>({});
    
    const containerRef = useRef<HTMLDivElement>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    // Normalize value safely
    const safeSelectedIds = useMemo((): number[] => {
      if (value === undefined || value === null) return [];
      if (Array.isArray(value)) {
        return value.filter((v) => typeof v === "number");
      }
      if (typeof value === "number") {
        return [value];
      }
      // If it is a string representation of number, parse it
      const parsed = Number(value);
      return isNaN(parsed) ? [] : [parsed];
    }, [value]);

    // Format full name
    const getUserFullName = (user: UserProfile): string => {
      const first = user.user_detail?.first_name?.trim() ?? "";
      const last = user.user_detail?.last_name?.trim() ?? "";
      return `${first} ${last}`.trim() || user.user_detail?.email || `User #${user.id}`;
    };

    // 2. Load missing selected user details on mount or value change
    useEffect(() => {
      const fetchMissingUsers = async () => {
        const missingIds = safeSelectedIds.filter((id) => !resolvedUsers[id]);
        if (missingIds.length === 0) return;

        try {
          const fetchedProfiles = await Promise.all(
            missingIds.map((id) => fetchUserProfile(id).catch(() => null))
          );

          setResolvedUsers((prev) => {
            const updated = { ...prev };
            fetchedProfiles.forEach((profile) => {
              if (profile && profile.id) {
                updated[profile.id] = profile;
              }
            });
            return updated;
          });
        } catch (err) {
          console.error("Failed to fetch selected user profiles", err);
        }
      };

      fetchMissingUsers();
    }, [safeSelectedIds, resolvedUsers]);

    // 3. Load users on opening dropdown or search query change
    useEffect(() => {
      if (!isOpen) return;

      const loadUsers = async () => {
        setLoading(true);
        try {
          const { items } = await fetchUsersPage(1, 50, { search: searchQuery || undefined });
          setUsersList(items);
          
          // Cache loaded users in resolvedUsers for instant selected-display resolution
          setResolvedUsers((prev) => {
            const updated = { ...prev };
            items.forEach((item) => {
              if (item.id) {
                updated[item.id] = item;
              }
            });
            return updated;
          });
        } catch (err) {
          console.error("Failed to load users list", err);
        } finally {
          setLoading(false);
        }
      };

      const delayDebounceFn = setTimeout(() => {
        loadUsers();
      }, searchQuery ? 300 : 0);

      return () => clearTimeout(delayDebounceFn);
    }, [isOpen, searchQuery]);

    // Handle click outside to close dropdown
    useEffect(() => {
      const handleClickOutside = (event: MouseEvent) => {
        if (
          containerRef.current &&
          !containerRef.current.contains(event.target as Node)
        ) {
          setIsOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Focus search input when dropdown opens
    useEffect(() => {
      if (isOpen && searchInputRef.current) {
        searchInputRef.current.focus();
      } else if (!isOpen) {
        setSearchQuery("");
      }
    }, [isOpen]);

    // Handle user selection logic
    const handleSelectUser = (userId: number) => {
      if (readOnly) return;

      if (isSingle) {
        // Single select mode
        onChange(userId);
        setIsOpen(false);
      } else {
        // Multi select mode
        const newValue = safeSelectedIds.includes(userId)
          ? safeSelectedIds.filter((id) => id !== userId)
          : [...safeSelectedIds, userId];
        onChange(newValue);
      }
    };

    // Remove user selection
    const handleRemoveUser = (e: React.MouseEvent, userId: number) => {
      e.stopPropagation();
      if (readOnly) return;

      if (isSingle) {
        onChange(null);
      } else {
        onChange(safeSelectedIds.filter((id) => id !== userId));
      }
    };

    // Selected user profiles list
    const selectedUsers = useMemo(() => {
      return safeSelectedIds
        .map((id) => resolvedUsers[id])
        .filter((user): user is UserProfile => !!user);
    }, [safeSelectedIds, resolvedUsers]);

    return (
      <div
        className={`flex flex-col gap-1.5 w-full ${className}`}
        ref={(node) => {
          containerRef.current = node;
          if (typeof ref === "function") {
            ref(node);
          } else if (ref) {
            ref.current = node;
          }
        }}
      >
        {label && (
          <div className="flex items-center justify-between">
            {typeof label === "string" ? (
              <label className="text-[13px] font-bold text-gray-600 dark:text-gray-300 uppercase tracking-wide">
                {label}
              </label>
            ) : (
              label
            )}
          </div>
        )}

        <div className="relative">
          <div
            onClick={() => !readOnly && setIsOpen(!isOpen)}
            className={`
              min-h-[42px] w-full rounded-[8px] border px-3 py-1.5 flex flex-wrap gap-1.5 items-center cursor-pointer transition-all duration-200 select-none
              ${readOnly ? "bg-gray-100 dark:bg-slate-800/50 cursor-not-allowed border-none text-gray-500" : "bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700"}
              ${errors ? "border-red-500 focus:ring-1 focus:ring-red-500" : "hover:border-gray-300 dark:hover:border-slate-600"}
              ${isOpen ? "ring-2 ring-blue-500/20 border-blue-500" : ""}
            `}
          >
            {selectedUsers.length > 0 ? (
              <div className="flex flex-wrap gap-1.5 flex-1 pr-6">
                {selectedUsers.map((user) => (
                  <span
                    key={user.id}
                    className="inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-0.5 bg-blue-50/70 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-semibold rounded-[4px] border border-blue-100 dark:border-blue-800/50"
                  >
                    {user.user_detail?.user_image ? (
                      <img
                        src={user.user_detail.user_image}
                        alt=""
                        className="w-4.5 h-4.5 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-4 h-4 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center text-[10px] font-bold text-blue-600 dark:text-blue-200 shrink-0 uppercase">
                        {user.user_detail?.first_name?.charAt(0) || "U"}
                      </div>
                    )}
                    <span className="truncate max-w-[150px]">{getUserFullName(user)}</span>
                    {!readOnly && (
                      <button
                        type="button"
                        onClick={(e) => handleRemoveUser(e, user.id)}
                        className="hover:bg-blue-100 dark:hover:bg-blue-800 p-0.5 rounded-full text-blue-500 hover:text-blue-900 dark:hover:text-blue-100 transition-colors shrink-0"
                      >
                        <X size={10} />
                      </button>
                    )}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-gray-400 dark:text-gray-500 text-sm flex-1">{displayPlaceholder}</span>
            )}

            <div className="text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <ChevronDown
                size={16}
                className={`transition-transform duration-200 ${isOpen ? "rotate-180 text-blue-500" : ""}`}
              />
            </div>
          </div>

          {isOpen && !readOnly && (
            <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-900 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
              {/* Search Header */}
              <div className="px-3 py-2.5 border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex items-center gap-2">
                <Search size={14} className="text-gray-400 shrink-0" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search by name or email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-transparent border-none text-xs text-gray-800 dark:text-gray-200 placeholder:text-gray-400 outline-none p-0.5"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>

              {/* Users Options List */}
              <div className="max-h-60 overflow-y-auto p-1 space-y-0.5 custom-scrollbar">
                {loading ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2 text-gray-400 dark:text-gray-500">
                    <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs">Searching users...</span>
                  </div>
                ) : usersList.length > 0 ? (
                  usersList.map((user) => {
                    const isSelected = safeSelectedIds.includes(user.id);
                    return (
                      <div
                        key={user.id}
                        onClick={() => handleSelectUser(user.id)}
                        className={`
                          px-3 py-2 text-sm flex items-center gap-3 cursor-pointer rounded-[6px] transition-all duration-150 select-none
                          ${
                            isSelected
                              ? "bg-blue-50/50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-medium"
                              : "hover:bg-gray-50 dark:hover:bg-slate-800/80 text-gray-700 dark:text-gray-300"
                          }
                        `}
                      >
                        {user.user_detail?.user_image ? (
                          <img
                            src={user.user_detail.user_image}
                            alt=""
                            className="w-8 h-8 rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-800 flex items-center justify-center text-xs font-bold text-blue-600 dark:text-blue-200 shrink-0 uppercase">
                            {user.user_detail?.first_name?.charAt(0) || "U"}
                          </div>
                        )}
                        <div className="flex flex-col flex-1 min-w-0">
                          <span className="truncate text-sm font-semibold">{getUserFullName(user)}</span>
                          <span className="truncate text-xs text-gray-400 dark:text-gray-500">
                            {user.user_detail?.email}
                          </span>
                        </div>
                        {isSelected && (
                          <Check size={14} className="text-blue-600 dark:text-blue-400 shrink-0" />
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="py-8 flex flex-col items-center justify-center text-gray-400 dark:text-gray-500 gap-1.5">
                    <CircleSlash size={16} />
                    <span className="text-xs italic">No users found</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {errors && (
          <span className="text-red-500 text-xs mt-0.5 ml-0.5">
            {errors.message}
          </span>
        )}
      </div>
    );
  }
);

UsersSelect.displayName = "UsersSelect";

export default UsersSelect;