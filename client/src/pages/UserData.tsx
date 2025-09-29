import { Layout } from "@/components/Layout";
import { UserDataPortability } from "@/components/UserDataPortability";

export default function UserData() {
  return (
    <Layout
      title="User Data Management"
      breadcrumbs={["Control", "User Data"]}
    >
      <UserDataPortability />
    </Layout>
  );
}