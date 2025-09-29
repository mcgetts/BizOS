import { Layout } from "@/components/Layout";
import { DataExport } from "@/components/DataExport";

export default function DataExportPage() {
  return (
    <Layout
      title="Data Export"
      breadcrumbs={["Control", "Data Export"]}
    >
      <DataExport />
    </Layout>
  );
}