import NordicAutoCareApp from "../../components/NordicAutoCareApp";

export default async function EmployeePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <NordicAutoCareApp mode="employee" employeeToken={token} />;
}
