import OlandServiceApp from "../../components/OlandServiceApp";

export default async function EmployeePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <OlandServiceApp mode="employee" employeeToken={token} />;
}
