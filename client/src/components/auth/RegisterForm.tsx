import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Eye, EyeOff, Loader2, Check, X } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerUserSchema, type RegisterUser } from "@shared/schema";

interface RegisterFormProps {
  onSubmit: (data: RegisterUser) => Promise<void>;
  onSwitchToLogin: () => void;
  isLoading?: boolean;
  error?: string;
}

interface PasswordStrength {
  score: number;
  feedback: string[];
  color: string;
}

function calculatePasswordStrength(password: string): PasswordStrength {
  let score = 0;
  const feedback: string[] = [];

  if (password.length >= 8) {
    score += 25;
  } else {
    feedback.push("At least 8 characters");
  }

  if (/[a-z]/.test(password)) {
    score += 25;
  } else {
    feedback.push("One lowercase letter");
  }

  if (/[A-Z]/.test(password)) {
    score += 25;
  } else {
    feedback.push("One uppercase letter");
  }

  if (/\d/.test(password)) {
    score += 25;
  } else {
    feedback.push("One number");
  }

  // Bonus points
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    score = Math.min(score + 10, 100);
  }

  if (password.length >= 12) {
    score = Math.min(score + 10, 100);
  }

  let color = "#ef4444"; // red
  if (score >= 75) color = "#22c55e"; // green
  else if (score >= 50) color = "#f59e0b"; // yellow
  else if (score >= 25) color = "#f97316"; // orange

  return { score, feedback, color };
}

export function RegisterForm({
  onSubmit,
  onSwitchToLogin,
  isLoading = false,
  error
}: RegisterFormProps) {
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting, isValid }
  } = useForm<RegisterUser>({
    resolver: zodResolver(registerUserSchema),
    mode: "onChange",
    defaultValues: {
      email: "",
      password: "",
      firstName: "",
      lastName: "",
      phone: "",
      department: "",
      position: ""
    }
  });

  const watchPassword = watch("password", "");
  const passwordStrength = calculatePasswordStrength(watchPassword);
  const loading = isLoading || isSubmitting;

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          Create Account
        </CardTitle>
        <CardDescription className="text-center">
          Fill in your details to create a new account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="firstName">First Name</Label>
              <Input
                id="firstName"
                placeholder="John"
                {...register("firstName")}
                disabled={loading}
              />
              {errors.firstName && (
                <p className="text-sm text-red-600">{errors.firstName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="lastName">Last Name</Label>
              <Input
                id="lastName"
                placeholder="Doe"
                {...register("lastName")}
                disabled={loading}
              />
              {errors.lastName && (
                <p className="text-sm text-red-600">{errors.lastName.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="john.doe@example.com"
              {...register("email")}
              disabled={loading}
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Create a strong password"
                {...register("password")}
                disabled={loading}
                className="pr-10"
              />
              <button
                type="button"
                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                onClick={() => setShowPassword(!showPassword)}
                disabled={loading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-400" />
                )}
              </button>
            </div>

            {watchPassword && (
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <div className="flex-1">
                    <Progress
                      value={passwordStrength.score}
                      className="h-2"
                      style={{
                        backgroundColor: '#e5e7eb',
                      }}
                    />
                  </div>
                  <span className="text-xs text-gray-600">
                    {passwordStrength.score < 25 ? 'Weak' :
                     passwordStrength.score < 50 ? 'Fair' :
                     passwordStrength.score < 75 ? 'Good' : 'Strong'}
                  </span>
                </div>

                {passwordStrength.feedback.length > 0 && (
                  <div className="text-xs space-y-1">
                    <p className="text-gray-600">Password must contain:</p>
                    {passwordStrength.feedback.map((item, index) => (
                      <div key={index} className="flex items-center space-x-1">
                        <X className="h-3 w-3 text-red-500" />
                        <span className="text-red-600">{item}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {errors.password && (
              <p className="text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone (Optional)</Label>
            <Input
              id="phone"
              type="tel"
              placeholder="+1 (555) 123-4567"
              {...register("phone")}
              disabled={loading}
            />
            {errors.phone && (
              <p className="text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="department">Department (Optional)</Label>
              <Input
                id="department"
                placeholder="Engineering"
                {...register("department")}
                disabled={loading}
              />
              {errors.department && (
                <p className="text-sm text-red-600">{errors.department.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="position">Position (Optional)</Label>
              <Input
                id="position"
                placeholder="Software Engineer"
                {...register("position")}
                disabled={loading}
              />
              {errors.position && (
                <p className="text-sm text-red-600">{errors.position.message}</p>
              )}
            </div>
          </div>

          <Button
            type="submit"
            className="w-full"
            disabled={loading || !isValid}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </Button>
        </form>

        <div className="text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-blue-600 hover:text-blue-800 font-medium underline"
              disabled={loading}
            >
              Sign in
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}