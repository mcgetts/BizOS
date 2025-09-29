import { Layout } from "@/components/Layout";
import { IntegrationManagement } from "@/components/IntegrationManagement";

export default function Integrations() {
  return (
    <Layout
      title="Integration Management"
      breadcrumbs={["Control", "Integrations"]}
    >
      <IntegrationManagement />
    </Layout>
  );
}