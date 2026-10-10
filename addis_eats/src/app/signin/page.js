import SignInForm from "./SignInForm";

export const metadata = {
  title: "Sign in",
  description: "Sign in to Addis Eats to place an order and track its live status.",
  robots: { index: false, follow: false },
};

export default async function SignInPage({ searchParams }) {
    const { next } = await searchParams;

    return (
        <div className="flex min-h-[70vh] items-center justify-center">
            <SignInForm nextPath={typeof next === "string" ? next : "/orders"} />
        </div>
    );
}
