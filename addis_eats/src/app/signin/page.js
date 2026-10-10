import SignInForm from "./SignInForm";

export default async function SignInPage({ searchParams }) {
    const { next } = await searchParams;

    return (
        <div className="flex min-h-[70vh] items-center justify-center">
            <SignInForm nextPath={typeof next === "string" ? next : "/orders"} />
        </div>
    );
}
