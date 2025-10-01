import { Building2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState } from "react";

/**
 * OrganizationIndicator Component
 *
 * Displays the current organization based on the subdomain.
 * In multi-tenant subdomain-based architecture, the organization is determined by the URL.
 *
 * Examples:
 * - acme.app.com -> Shows "Acme"
 * - localhost:3000 or app.com -> Shows "Default"
 */
export function OrganizationIndicator() {
  const [subdomain, setSubdomain] = useState<string>("default");
  const [orgName, setOrgName] = useState<string>("Default");

  useEffect(() => {
    const hostname = window.location.hostname;
    const extractedSubdomain = extractSubdomain(hostname);
    setSubdomain(extractedSubdomain);
    setOrgName(formatOrganizationName(extractedSubdomain));
  }, []);

  return (
    <div className="flex items-center space-x-2 px-3 py-1.5 bg-muted/50 rounded-md border border-border">
      <Building2 className="w-4 h-4 text-muted-foreground" />
      <div className="flex flex-col">
        <span className="text-xs text-muted-foreground">Organization</span>
        <span className="text-sm font-medium text-foreground">{orgName}</span>
      </div>
      {subdomain === "default" && (
        <Badge variant="outline" className="text-xs">
          Dev
        </Badge>
      )}
    </div>
  );
}

/**
 * Extract subdomain from hostname
 */
function extractSubdomain(hostname: string): string {
  // Remove port if present
  const host = hostname.split(':')[0];

  // For localhost, use 'default' subdomain
  if (host === 'localhost' || host === '127.0.0.1') {
    return 'default';
  }

  // Split by dots
  const parts = host.split('.');

  // If only domain.com (2 parts) or less, no subdomain -> default
  if (parts.length <= 2) {
    return 'default';
  }

  // Return first part as subdomain
  return parts[0];
}

/**
 * Format subdomain into organization name
 */
function formatOrganizationName(subdomain: string): string {
  if (!subdomain || subdomain === 'default') {
    return 'Default Organization';
  }

  // Convert subdomain to Title Case
  // e.g., "acme-corp" -> "Acme Corp"
  return subdomain
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}
