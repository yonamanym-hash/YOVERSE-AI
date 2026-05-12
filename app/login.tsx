// Powered by OnSpace.AI
import React, { useState } from 'react';
import {
  View, Text, TextInput, StyleSheet, Pressable,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useAuth, useAlert } from '@/template';
import { Colors, Spacing, FontSize, FontWeight, Radius, Shadow } from '@/constants/theme';
import { getSupabaseClient } from '@/template';

type Mode = 'login' | 'register' | 'otp';

export default function LoginScreen() {
  const { sendOTP, verifyOTPAndLogin, signInWithPassword, operationLoading } = useAuth();
  const { showAlert } = useAlert();

  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      showAlert('Missing fields', 'Please enter your email and password.');
      return;
    }
    const { error } = await signInWithPassword(email.trim(), password);
    if (error) showAlert('Login Failed', error);
  };

  const handleSendOTP = async () => {
    if (!email.trim()) {
      showAlert('Missing email', 'Enter your email address first.');
      return;
    }
    if (password.length < 6) {
      showAlert('Weak password', 'Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      showAlert('Password mismatch', 'Passwords do not match.');
      return;
    }
    const { error } = await sendOTP(email.trim());
    if (error) {
      showAlert('Error', error);
    } else {
      setMode('otp');
    }
  };

  const handleVerifyOTP = async () => {
    if (otp.length < 4) {
      showAlert('Invalid code', 'Enter the 4-digit code sent to your email.');
      return;
    }
    const { error, user } = await verifyOTPAndLogin(email.trim(), otp, { password });
    if (error) {
      showAlert('Verification Failed', error);
    } else if (user) {
      // Record the new user join for Yonas's admin panel
      try {
        const supabase = getSupabaseClient();
        await supabase.from('user_joins').insert({
          user_id: user.id,
          email: user.email,
          username: user.username ?? null,
        });
      } catch {
        // Non-critical
      }
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Logo / Branding */}
          <View style={styles.brandSection}>
            <View style={styles.logoRing}>
              <Text style={styles.logoText}>DT</Text>
            </View>
            <Text style={styles.appName}>Digital Twin</Text>
            <Text style={styles.appTagline}>
              {mode === 'login'
                ? "Yonas's AI — Sign in to continue"
                : mode === 'register'
                ? 'Create your account'
                : 'Check your email'}
            </Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            {/* Mode Tabs (login / register) */}
            {mode !== 'otp' && (
              <View style={styles.modeTabs}>
                <Pressable
                  style={[styles.modeTab, mode === 'login' && styles.modeTabActive]}
                  onPress={() => setMode('login')}
                >
                  <Text style={[styles.modeTabText, mode === 'login' && styles.modeTabTextActive]}>
                    Sign In
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.modeTab, mode === 'register' && styles.modeTabActive]}
                  onPress={() => setMode('register')}
                >
                  <Text style={[styles.modeTabText, mode === 'register' && styles.modeTabTextActive]}>
                    Register
                  </Text>
                </Pressable>
              </View>
            )}

            {/* OTP Step */}
            {mode === 'otp' ? (
              <View style={styles.otpSection}>
                <View style={styles.otpIcon}>
                  <MaterialIcons name="mark-email-read" size={32} color={Colors.primary} />
                </View>
                <Text style={styles.otpTitle}>Verification Code</Text>
                <Text style={styles.otpSub}>
                  A 4-digit code was sent to{'\n'}
                  <Text style={styles.otpEmail}>{email}</Text>
                </Text>

                <View style={styles.inputWrap}>
                  <MaterialIcons name="pin" size={18} color={Colors.textMuted} />
                  <TextInput
                    style={styles.input}
                    value={otp}
                    onChangeText={setOtp}
                    placeholder="Enter 4-digit code"
                    placeholderTextColor={Colors.textMuted}
                    keyboardType="numeric"
                    maxLength={6}
                    autoFocus
                  />
                </View>

                <Pressable
                  style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }]}
                  onPress={handleVerifyOTP}
                  disabled={operationLoading}
                >
                  {operationLoading ? (
                    <ActivityIndicator color={Colors.textInverse} />
                  ) : (
                    <>
                      <MaterialIcons name="verified" size={18} color={Colors.textInverse} />
                      <Text style={styles.primaryBtnText}>Verify & Create Account</Text>
                    </>
                  )}
                </Pressable>

                <Pressable onPress={() => setMode('register')} style={styles.backBtn}>
                  <MaterialIcons name="arrow-back" size={15} color={Colors.textMuted} />
                  <Text style={styles.backBtnText}>Back</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.formSection}>
                {/* Email */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Email</Text>
                  <View style={styles.inputWrap}>
                    <MaterialIcons name="email" size={18} color={Colors.textMuted} />
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      placeholder="your@email.com"
                      placeholderTextColor={Colors.textMuted}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>

                {/* Password */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Password</Text>
                  <View style={styles.inputWrap}>
                    <MaterialIcons name="lock" size={18} color={Colors.textMuted} />
                    <TextInput
                      style={styles.input}
                      value={password}
                      onChangeText={setPassword}
                      placeholder="Min 6 characters"
                      placeholderTextColor={Colors.textMuted}
                      secureTextEntry={!showPassword}
                    />
                    <Pressable onPress={() => setShowPassword((s) => !s)} hitSlop={8}>
                      <MaterialIcons
                        name={showPassword ? 'visibility-off' : 'visibility'}
                        size={18}
                        color={Colors.textMuted}
                      />
                    </Pressable>
                  </View>
                </View>

                {/* Confirm Password (register only) */}
                {mode === 'register' && (
                  <View style={styles.fieldGroup}>
                    <Text style={styles.fieldLabel}>Confirm Password</Text>
                    <View style={styles.inputWrap}>
                      <MaterialIcons name="lock-outline" size={18} color={Colors.textMuted} />
                      <TextInput
                        style={styles.input}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder="Repeat your password"
                        placeholderTextColor={Colors.textMuted}
                        secureTextEntry={!showPassword}
                      />
                    </View>
                  </View>
                )}

                {/* Action Button */}
                <Pressable
                  style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.85 }, operationLoading && styles.primaryBtnDisabled]}
                  onPress={mode === 'login' ? handleLogin : handleSendOTP}
                  disabled={operationLoading}
                >
                  {operationLoading ? (
                    <ActivityIndicator color={Colors.textInverse} />
                  ) : (
                    <>
                      <MaterialIcons
                        name={mode === 'login' ? 'login' : 'person-add'}
                        size={18}
                        color={Colors.textInverse}
                      />
                      <Text style={styles.primaryBtnText}>
                        {mode === 'login' ? 'Sign In' : 'Send Verification Code'}
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            )}
          </View>

          {/* Footer note */}
          <Text style={styles.footer}>
            Powered by OnSpace AI · Digital Twin v2.0
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  scroll: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: Spacing.md, paddingVertical: Spacing.xl },

  brandSection: { alignItems: 'center', marginBottom: Spacing.xl },
  logoRing: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.primaryGlow,
    borderWidth: 2.5,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadow.gold,
  },
  logoText: { fontSize: 24, fontWeight: FontWeight.bold, color: Colors.primary },
  appName: { fontSize: FontSize.xl, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  appTagline: { fontSize: FontSize.sm, color: Colors.textSecondary, marginTop: 4 },

  card: {
    backgroundColor: Colors.surfaceElevated,
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
    padding: Spacing.lg,
    ...Shadow.card,
  },

  modeTabs: {
    flexDirection: 'row',
    backgroundColor: Colors.surface,
    borderRadius: Radius.lg,
    padding: 4,
    marginBottom: Spacing.lg,
    borderWidth: 1,
    borderColor: Colors.surfaceBorder,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: Radius.md,
    alignItems: 'center',
  },
  modeTabActive: { backgroundColor: Colors.primary },
  modeTabText: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textMuted },
  modeTabTextActive: { color: Colors.textInverse },

  formSection: { gap: Spacing.md },
  fieldGroup: { gap: 7 },
  fieldLabel: { fontSize: FontSize.sm, fontWeight: FontWeight.semibold, color: Colors.textSecondary },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.inputBg,
    borderWidth: 1,
    borderColor: Colors.inputBorder,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 13,
  },
  input: {
    flex: 1,
    fontSize: FontSize.base,
    color: Colors.textPrimary,
  },

  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 15,
    borderRadius: Radius.lg,
    marginTop: Spacing.sm,
    ...Shadow.gold,
  },
  primaryBtnDisabled: { backgroundColor: Colors.textMuted, shadowOpacity: 0 },
  primaryBtnText: { fontSize: FontSize.base, fontWeight: FontWeight.bold, color: Colors.textInverse },

  // OTP section
  otpSection: { alignItems: 'center', gap: Spacing.md },
  otpIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.primaryGlow,
    borderWidth: 2,
    borderColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  otpTitle: { fontSize: FontSize.md, fontWeight: FontWeight.bold, color: Colors.textPrimary },
  otpSub: { fontSize: FontSize.sm, color: Colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  otpEmail: { color: Colors.primary, fontWeight: FontWeight.semibold },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
  },
  backBtnText: { fontSize: FontSize.sm, color: Colors.textMuted },

  footer: {
    textAlign: 'center',
    fontSize: FontSize.xs,
    color: Colors.textMuted,
    marginTop: Spacing.xl,
  },
});
