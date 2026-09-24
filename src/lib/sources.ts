/** Source configuration registry.
 *  Add a new entry here whenever a new quiz / website integration is added.
 *  metadataColumns defines which metadata keys get their own table columns
 *  when that source is selected in the Leads view.
 */
export interface SourceConfig {
  label: string;
  color: string;
  metadataColumns: Array<{ key: string; label: string }>;
}

/**
 * Legacy source keys, mapped to the key in use now.
 *
 * KAPVOY leads were stored as 'fundwise' from the FundWise era. The rows are
 * being migrated to 'kapvoy', and until every one of them is, both values are
 * in the database at once — so everything that reads a source runs it through
 * normaliseSource() first and sees only the new key.
 *
 * This entry stays until the migration is confirmed complete. Removing it
 * early sends every unmigrated row to the unknown-source fallback, which
 * strips its label AND its metadata columns.
 */
const SOURCE_ALIASES: Record<string, string> = {
  fundwise: "kapvoy",
};

/**
 * The canonical key for a stored source value.
 *
 * Call this on anything read from the database or arriving over the API,
 * before comparing, grouping or looking up config.
 */
export function normaliseSource(source: string | null | undefined): string {
  const s = (source ?? "").trim();
  return SOURCE_ALIASES[s] ?? s;
}

export const SOURCE_CONFIGS: Record<string, SourceConfig> = {
  kapvoy: {
    label: "KAPVOY Advisory",
    color: "#2D6A34",
    metadataColumns: [
      { key: "financing_type",     label: "Financing Type"  },
      { key: "funding_amount",     label: "Funding Amount"  },
      { key: "operating_time",     label: "Time in Biz"     },
      { key: "business_structure", label: "Biz Structure"   },
    ],
  },
  "instagram-ads": {
    label: "Instagram Ads",
    color: "#E1306C",
    metadataColumns: [],
  },
  "meta-ads": {
    label: "Meta Ads",
    color: "#1877F2",
    metadataColumns: [],
  },
  website: {
    label: "Website",
    color: "#2563EB",
    metadataColumns: [],
  },
  "indian-life-memorial": {
    label: "Indian Life Memorial",
    color: "#B45309",
    metadataColumns: [
      { key: "arrangement_type",  label: "Service Type"  },
      { key: "planning_type",     label: "Planning"      },
      { key: "disposition_type",  label: "Disposition"   },
      { key: "wake_duration",     label: "Wake"          },
      { key: "location",          label: "Wake Location" },
      { key: "coffin_choice",     label: "Casket"        },
      { key: "estimated_cost",    label: "Funding Amt."     },
    ],
  },
};

/** Returns config for a source, with a sensible fallback for unknown sources.
 *  Normalises first, so a legacy key still resolves to its real config. */
export function getSourceConfig(source: string): SourceConfig {
  return (
    SOURCE_CONFIGS[normaliseSource(source)] ?? {
      label: source ?? "Unknown",
      color: "#6b7280",
      metadataColumns: [],
    }
  );
}
