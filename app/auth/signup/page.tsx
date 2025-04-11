import Image from 'next/image';

export default function SignupPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-lg">
        <div className="flex flex-col items-center">
          <Image
            src="/logo.png"
            alt="InventAssist Logo"
            width={200}
            height={200}
            className="mb-4"
          />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Create your account
          </h2>
        </div>
        // ... rest of the signup form ...
      </div>
    </div>
  );
} 