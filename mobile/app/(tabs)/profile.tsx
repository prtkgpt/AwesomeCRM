import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/services/api';
import { CleanerProfile } from '@/types';
import { COLORS } from '@/constants';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [profile, setProfile] = useState<CleanerProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    const response = await api.getProfile();
    if (response.data) {
      setProfile(response.data);
    }
    setIsLoading(false);
  };

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to log out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: logout },
      ]
    );
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.header}>
        <View style={styles.avatar}>
          <Ionicons name="person" size={48} color={COLORS.primary} />
        </View>
        <Text style={styles.name}>{user?.name || 'Cleaner'}</Text>
        <Text style={styles.email}>{user?.email}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Contact Information</Text>
        <ProfileRow
          icon="call-outline"
          label="Phone"
          value={profile?.phone || 'Not set'}
        />
        <ProfileRow
          icon="mail-outline"
          label="Email"
          value={user?.email || 'Not set'}
        />
      </View>

      {profile?.emergencyContactName && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Emergency Contact</Text>
          <ProfileRow
            icon="person-outline"
            label="Name"
            value={profile.emergencyContactName}
          />
          <ProfileRow
            icon="call-outline"
            label="Phone"
            value={profile.emergencyContactPhone || 'Not set'}
          />
        </View>
      )}

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Work Details</Text>
        <ProfileRow
          icon="briefcase-outline"
          label="Experience"
          value={profile?.experienceLevel || 'Not set'}
        />
        {profile?.specialties && profile.specialties.length > 0 && (
          <ProfileRow
            icon="star-outline"
            label="Specialties"
            value={profile.specialties.join(', ')}
          />
        )}
        {profile?.hourlyRate && (
          <ProfileRow
            icon="cash-outline"
            label="Hourly Rate"
            value={`$${profile.hourlyRate}/hr`}
          />
        )}
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={20} color={COLORS.danger} />
        <Text style={styles.logoutText}>Logout</Text>
      </TouchableOpacity>

      <Text style={styles.version}>CleanDay Mobile v1.0.0</Text>
    </ScrollView>
  );
}

function ProfileRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.row}>
      <View style={styles.rowIcon}>
        <Ionicons name={icon} size={20} color={COLORS.gray[500]} />
      </View>
      <View style={styles.rowContent}>
        <Text style={styles.rowLabel}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  content: {
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  header: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  email: {
    fontSize: 14,
    color: COLORS.gray[500],
    marginTop: 4,
  },
  section: {
    marginTop: 24,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: COLORS.gray[200],
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray[500],
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.gray[100],
  },
  rowIcon: {
    width: 32,
  },
  rowContent: {
    flex: 1,
  },
  rowLabel: {
    fontSize: 12,
    color: COLORS.gray[500],
  },
  rowValue: {
    fontSize: 16,
    color: COLORS.gray[900],
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 32,
    marginHorizontal: 16,
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.danger + '30',
    gap: 8,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.danger,
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: COLORS.gray[400],
    marginTop: 24,
  },
});
