/**
 * Feature Flags System
 *
 * This module provides utilities for checking if features are enabled for a company.
 * Features can be toggled per-company via the enabledFeatures JSON field.
 */

export type CompanyFeatures = {
  insuranceBilling?: boolean;
  recurringBilling?: boolean;
  teamManagement?: boolean;
};

/**
 * Check if a feature is enabled for a company
 * @param enabledFeatures - The company's enabledFeatures JSON object
 * @param feature - The feature to check
 * @returns true if the feature is enabled, false otherwise
 */
export function hasFeature(
  enabledFeatures: any,
  feature: keyof CompanyFeatures
): boolean {
  if (!enabledFeatures || typeof enabledFeatures !== 'object') {
    return false;
  }

  return enabledFeatures[feature] === true;
}

/**
 * Check if insurance billing is enabled for a company
 * @param enabledFeatures - The company's enabledFeatures JSON object
 * @returns true if insurance billing is enabled
 */
export function hasInsuranceBilling(enabledFeatures: any): boolean {
  return hasFeature(enabledFeatures, 'insuranceBilling');
}

/**
 * Check if recurring billing is enabled for a company
 * @param enabledFeatures - The company's enabledFeatures JSON object
 * @returns true if recurring billing is enabled
 */
export function hasRecurringBilling(enabledFeatures: any): boolean {
  return hasFeature(enabledFeatures, 'recurringBilling');
}

/**
 * Check if team management is enabled for a company
 * @param enabledFeatures - The company's enabledFeatures JSON object
 * @returns true if team management is enabled
 */
export function hasTeamManagement(enabledFeatures: any): boolean {
  return hasFeature(enabledFeatures, 'teamManagement');
}

/**
 * Get default features for a new company
 * @returns Default feature flags
 */
export function getDefaultFeatures(): CompanyFeatures {
  return {
    insuranceBilling: false, // Disabled by default
    recurringBilling: true,
    teamManagement: true,
  };
}
