import { useState } from 'react';
import { Button, Checkbox, InlineNotification, Link, PasswordInput, TextInput } from '@carbon/react';
import AuthLayout from '../components/AuthLayout';
import { signIn } from '../lib/authApi';
import styles from './AuthPage.module.scss';

function SignInPage({ onSwitchMode, onSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!email.trim() || !password.trim()) {
      setError('Enter both your work email and password.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const response = await signIn({
        email: email.trim(),
        password,
        rememberMe
      });
      onSuccess(response.user);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      eyebrow="Access Portal"
      title="Sign in to the monitoring console."
      description="Review incidents, certificate drift, and domain renewals from the same Carbon-aligned workspace your operators already use.">
      <section className={styles.authCard}>
        <div className={styles.cardHeader}>
          <h2 className={styles.heading}>Welcome back</h2>
          <p className={styles.subheading}>Use your team credentials to continue into the dashboard.</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error ? (
            <InlineNotification lowContrast kind="error" hideCloseButton title="Authentication blocked" subtitle={error} />
          ) : null}

          <TextInput
            id="sign-in-email"
            labelText="Work email"
            placeholder="ops@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            disabled={isSubmitting}
          />

          <PasswordInput
            id="sign-in-password"
            labelText="Password"
            placeholder="Enter your password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            disabled={isSubmitting}
          />

          <div className={styles.checkboxRow}>
            <Checkbox
              id="remember-me"
              labelText="Keep this device trusted for 7 days"
              checked={rememberMe}
              onChange={(_, { checked }) => setRememberMe(checked)}
              disabled={isSubmitting}
            />
            <Button kind="ghost" size="sm" type="button" className={styles.helperButton} disabled={isSubmitting}>
              Reset password
            </Button>
          </div>

          <Button type="submit" size="lg" className={styles.submitButton} style={{ width: '100%', maxWidth: '100%' }} disabled={isSubmitting}>
            {isSubmitting ? 'Signing in...' : 'Sign in'}
          </Button>
        </form>

        <div className={styles.metaRow}>
          <p className={styles.metaText}>
            Need an account?{' '}
            <Link
              href="#sign-up"
              onClick={(event) => {
                event.preventDefault();
                onSwitchMode();
              }}>
              Create one
            </Link>
          </p>
        </div>
      </section>
    </AuthLayout>
  );
}

export default SignInPage;
