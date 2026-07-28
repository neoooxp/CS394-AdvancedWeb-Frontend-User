import { useState } from 'react';
import { useForm } from '@tanstack/react-form';
import { useMutation } from '@tanstack/react-query';
import { User, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { loginDriver } from '../services/authApi';

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);

  // TanStack Query mutation connecting to backend API endpoint (/api/auth/login)
  const loginMutation = useMutation({
    mutationFn: loginDriver,
  });

  // TanStack Form configuration
  const form = useForm({
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
    onSubmit: async ({ value }) => {
      loginMutation.mutate(value);
    },
  });

  return (
    <div className="auth-card">
      <h2 className="card-title">Welcome back</h2>
      <p className="card-subtitle">Please enter your credentials to access your shift.</p>

      {loginMutation.isSuccess && (
        <div className="status-alert success">
          Successfully logged in! Role: <strong>{loginMutation.data?.role || 'User'}</strong>
        </div>
      )}

      {loginMutation.isError && (
        <div className="status-alert error">
          {loginMutation.error?.message || 'Login failed. Please check your credentials.'}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          e.stopPropagation();
          form.handleSubmit();
        }}
        className="form-group"
      >
        {/* Email Field with TanStack Form */}
        <form.Field
          name="email"
          validators={{
            onChange: ({ value }) => {
              if (!value) return 'Email is required';
              if (!/\S+@\S+\.\S+/.test(value)) return 'Please enter a valid email address';
              return undefined;
            },
          }}
        >
          {(field) => (
            <div className="field-container">
              <div className="field-header">
                <label htmlFor={field.name} className="field-label">
                  Email
                </label>
              </div>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <User size={18} />
                </span>
                <input
                  id={field.name}
                  name={field.name}
                  type="email"
                  placeholder="name@example.com"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className={`form-input ${field.state.meta.errors.length ? 'is-invalid' : ''}`}
                />
              </div>
              {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                <span className="field-error">{field.state.meta.errors.join(', ')}</span>
              )}
            </div>
          )}
        </form.Field>

        {/* Password Field with TanStack Form */}
        <form.Field
          name="password"
          validators={{
            onChange: ({ value }) => {
              if (!value) return 'Password is required';
              if (value.length < 6) return 'Password must be at least 6 characters';
              return undefined;
            },
          }}
        >
          {(field) => (
            <div className="field-container">
              <div className="field-header">
                <label htmlFor={field.name} className="field-label">
                  Password
                </label>
                <a href="#forgot" className="forgot-link">
                  Forgot password?
                </a>
              </div>
              <div className="input-wrapper">
                <span className="input-icon-left">
                  <Lock size={18} />
                </span>
                <input
                  id={field.name}
                  name={field.name}
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                  className={`form-input has-right-icon ${field.state.meta.errors.length ? 'is-invalid' : ''}`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="input-icon-right-btn"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
                <span className="field-error">{field.state.meta.errors.join(', ')}</span>
              )}
            </div>
          )}
        </form.Field>

        {/* Remember Me Checkbox with TanStack Form */}
        <form.Field name="rememberMe">
          {(field) => (
            <label className="remember-container">
              <input
                type="checkbox"
                id={field.name}
                name={field.name}
                checked={field.state.value}
                onChange={(e) => field.handleChange(e.target.checked)}
                className="checkbox-input"
              />
              <span className="remember-label">Remember this device for 30 days</span>
            </label>
          )}
        </form.Field>

        {/* Submit Button */}
        <form.Subscribe selector={(state) => [state.canSubmit, state.isSubmitting]}>
          {([canSubmit]) => (
            <button
              type="submit"
              disabled={!canSubmit || loginMutation.isPending}
              className="submit-btn"
            >
              {loginMutation.isPending ? (
                <div className="spinner" />
              ) : (
                <>
                  <span>Login to Portal</span>
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          )}
        </form.Subscribe>
      </form>
    </div>
  );
}
