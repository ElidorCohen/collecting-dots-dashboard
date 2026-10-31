import { SignOutButton } from "@clerk/nextjs";

export default function UnauthorizedPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md w-full space-y-8 text-center">
        <div>
          <div className="mx-auto h-12 w-12 text-destructive">
            <svg className="h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="mt-6 text-center font-display text-3xl text-foreground">
            Access Denied
          </h2>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Your email address is not authorized to access this dashboard.
          </p>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Please contact your administrator if you believe this is an error.
          </p>
        </div>
        <div className="mt-8">
          <SignOutButton>
            <button className="flex w-full justify-center rounded-lg bg-primary px-4 py-3 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/85 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              Sign Out
            </button>
          </SignOutButton>
        </div>
      </div>
    </div>
  );
}