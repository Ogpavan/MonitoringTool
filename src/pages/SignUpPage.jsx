import { useState } from 'react';
import { Button, Checkbox, InlineNotification, Link, PasswordInput, TextInput } from '@carbon/react';
import AuthLayout from '../components/AuthLayout';
import { signUp } from '../lib/authApi';
import styles from './AuthPage.module.scss';

function SignUpPage({ onSwitchMode, onSuccess }) {
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    teamName: '',
    email: '',
    password: '',
    confirmPassword: '',
    agreedToTerms: true
  });
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateField = (field) => (event) => {
    const value = event.target.value;
    setForm((current) => ({ ...current, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.firstName.trim() || !form.lastName.trim() || !form.teamName.trim() || !form.email.trim() || !form.password.trim()) {
      setError('Complete all required fields before creating the workspace.');
      return;
    }

    if (form.password !== form.confirmPassword) {
      setError('Password confirmation must match.');
      return;
    }

    if (!form.agreedToTerms) {
      setError('You must accept the platform terms to continue.');
      return;
    }

    setError('');
    setIsSubmitting(true);

    try {
      const response = await signUp({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        teamName: form.teamName.trim(),
        email: form.email.trim(),
        password: form.password
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
      eyebrow="Provision Access"
      title="Create an operator workspace."
      description="Bring SSL scans, alerting policies, and infrastructure health into a single control surface with the same IBM Carbon visual language as the product.">
      <section className={styles.authCard}>
        <div className={styles.cardHeader}>
          <h2 className={styles.heading}>Create account</h2>
          <p className={styles.subheading}>Set up a team workspace and land directly in the monitoring dashboard.</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          {error ? (
            <InlineNotification lowContrast kind="error" hideCloseButton title="Provisioning blocked" subtitle={error} />
          ) : null}

          <div className={styles.splitFields}>
            <TextInput id="sign-up-first-name" labelText="First name" value={form.firstName} onChange={updateField('firstName')} disabled={isSubmitting} />
            <TextInput id="sign-up-last-name" labelText="Last name" value={form.lastName} onChange={updateField('lastName')} disabled={isSubmitting} />
          </div>

          <TextInput
            id="sign-up-team"
            labelText="Team or workspace name"
            placeholder="Platform Operations"
            value={form.teamName}
            onChange={updateField('teamName')}
            disabled={isSubmitting}
          />

          <TextInput
            id="sign-up-email"
            labelText="Work email"
            placeholder="lead@company.com"
            value={form.email}
            onChange={updateField('email')}
            disabled={isSubmitting}
          />

          <div className={styles.splitFields}>
            <PasswordInput id="sign-up-password" labelText="Password" value={form.password} onChange={updateField('password')} disabled={isSubmitting} />
            <PasswordInput
              id="sign-up-confirm-password"
              labelText="Confirm password"
              value={form.confirmPassword}
              onChange={updateField('confirmPassword')}
              disabled={isSubmitting}
            />
          </div>

          <Checkbox
            id="sign-up-terms"
            labelText="I agree to the platform terms, audit logging, and team access controls."
            checked={form.agreedToTerms}
            onChange={(_, { checked }) => setForm((current) => ({ ...current, agreedToTerms: checked }))}
            disabled={isSubmitting}
          />

          <Button type="submit" size="lg" className={styles.submitButton} disabled={isSubmitting}>
            {isSubmitting ? 'Creating workspace...' : 'Create workspace'}
          </Button>
        </form>

        <div className={styles.metaRow}>
          <p className={styles.metaText}>
            Already onboarded?{' '}
            <Link
              href="#sign-in"
              onClick={(event) => {
                event.preventDefault();
                onSwitchMode();
              }}>
              Sign in
            </Link>
          </p>
        </div>
      </section>
    </AuthLayout>
  );
}

export default SignUpPage;
