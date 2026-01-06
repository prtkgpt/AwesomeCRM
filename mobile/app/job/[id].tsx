import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useJob } from '@/hooks/useJobs';
import { ActionButton, EmptyState } from '@/components';
import { COLORS } from '@/constants';

export default function JobDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { job, isLoading, error, onMyWay, clockIn, clockOut } = useJob(id);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const handleOnMyWay = async () => {
    setActionLoading('onmyway');
    const result = await onMyWay();
    setActionLoading(null);
    if (result.success) {
      Alert.alert('Success', 'Customer has been notified that you are on your way!');
    } else {
      Alert.alert('Error', result.error || 'Failed to send notification');
    }
  };

  const handleClockIn = async () => {
    setActionLoading('clockin');
    const result = await clockIn();
    setActionLoading(null);
    if (!result.success) {
      Alert.alert('Error', result.error || 'Failed to clock in');
    }
  };

  const handleClockOut = async () => {
    Alert.alert(
      'Clock Out',
      'Are you sure you want to clock out and complete this job?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clock Out',
          onPress: async () => {
            setActionLoading('clockout');
            const result = await clockOut();
            setActionLoading(null);
            if (result.success) {
              Alert.alert('Job Completed', 'Great work! The job has been marked as complete.');
            } else {
              Alert.alert('Error', result.error || 'Failed to clock out');
            }
          },
        },
      ]
    );
  };

  const openMaps = () => {
    if (!job?.address) return;

    const address = encodeURIComponent(
      `${job.address.street}, ${job.address.city}, ${job.address.state} ${job.address.zip}`
    );

    const url = Platform.select({
      ios: `maps:0,0?q=${address}`,
      android: `geo:0,0?q=${address}`,
    });

    if (url) {
      Linking.openURL(url);
    }
  };

  const formatTime = (time: string | null) => {
    if (!time) return null;
    return new Date(time).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error || !job) {
    return (
      <View style={styles.centered}>
        <EmptyState
          icon="alert-circle-outline"
          title="Job not found"
          message={error || 'Unable to load job details'}
        />
      </View>
    );
  }

  const clientName = `${job.client.firstName} ${job.client.lastName}`;
  const isCompleted = !!job.clockedOutAt;
  const isClockedIn = !!job.clockedInAt && !job.clockedOutAt;
  const isOnMyWay = !!job.onMyWaySentAt && !job.clockedInAt;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Client Info */}
      <View style={styles.card}>
        <Text style={styles.clientName}>{clientName}</Text>
        <Text style={styles.serviceType}>{job.serviceType}</Text>

        {job.address && (
          <View style={styles.addressContainer}>
            <View style={styles.addressRow}>
              <Ionicons name="location" size={20} color={COLORS.primary} />
              <View style={styles.addressText}>
                <Text style={styles.street}>{job.address.street}</Text>
                {job.address.unit && (
                  <Text style={styles.unit}>Unit {job.address.unit}</Text>
                )}
                <Text style={styles.cityState}>
                  {job.address.city}, {job.address.state} {job.address.zip}
                </Text>
              </View>
            </View>
            <ActionButton
              title="Get Directions"
              icon="navigate-outline"
              onPress={openMaps}
              variant="outline"
            />
          </View>
        )}
      </View>

      {/* Job Details */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Job Details</Text>
        <View style={styles.detailsGrid}>
          <DetailItem
            icon="calendar-outline"
            label="Date"
            value={new Date(job.scheduledDate).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })}
          />
          <DetailItem
            icon="time-outline"
            label="Duration"
            value={`${job.duration} minutes`}
          />
          <DetailItem
            icon="cash-outline"
            label="Price"
            value={`$${job.price}`}
          />
          <DetailItem
            icon="hourglass-outline"
            label="Status"
            value={isCompleted ? 'Completed' : isClockedIn ? 'In Progress' : 'Scheduled'}
          />
        </View>
      </View>

      {/* Special Instructions */}
      {job.address && (job.address.gateCode || job.address.parkingInfo || job.address.petInfo || job.address.specialInstructions) && (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Special Instructions</Text>
          {job.address.gateCode && (
            <InstructionRow icon="key-outline" label="Gate Code" value={job.address.gateCode} />
          )}
          {job.address.parkingInfo && (
            <InstructionRow icon="car-outline" label="Parking" value={job.address.parkingInfo} />
          )}
          {job.address.petInfo && (
            <InstructionRow icon="paw-outline" label="Pets" value={job.address.petInfo} />
          )}
          {job.address.specialInstructions && (
            <InstructionRow icon="information-circle-outline" label="Notes" value={job.address.specialInstructions} />
          )}
        </View>
      )}

      {/* Timeline */}
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Timeline</Text>
        <TimelineItem
          label="On My Way"
          time={formatTime(job.onMyWaySentAt)}
          isActive={isOnMyWay}
          isCompleted={!!job.onMyWaySentAt}
        />
        <TimelineItem
          label="Clocked In"
          time={formatTime(job.clockedInAt)}
          isActive={isClockedIn}
          isCompleted={!!job.clockedInAt}
        />
        <TimelineItem
          label="Clocked Out"
          time={formatTime(job.clockedOutAt)}
          isActive={false}
          isCompleted={!!job.clockedOutAt}
          isLast
        />
      </View>

      {/* Action Buttons */}
      {!isCompleted && (
        <View style={styles.actionContainer}>
          {!job.onMyWaySentAt && (
            <ActionButton
              title="On My Way"
              icon="car-outline"
              onPress={handleOnMyWay}
              variant="primary"
              isLoading={actionLoading === 'onmyway'}
            />
          )}
          {job.onMyWaySentAt && !job.clockedInAt && (
            <ActionButton
              title="Clock In"
              icon="play-circle-outline"
              onPress={handleClockIn}
              variant="success"
              isLoading={actionLoading === 'clockin'}
            />
          )}
          {job.clockedInAt && !job.clockedOutAt && (
            <ActionButton
              title="Clock Out"
              icon="stop-circle-outline"
              onPress={handleClockOut}
              variant="warning"
              isLoading={actionLoading === 'clockout'}
            />
          )}
        </View>
      )}

      {isCompleted && (
        <View style={styles.completedBanner}>
          <Ionicons name="checkmark-circle" size={24} color={COLORS.success} />
          <Text style={styles.completedText}>Job Completed</Text>
        </View>
      )}
    </ScrollView>
  );
}

function DetailItem({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.detailItem}>
      <Ionicons name={icon} size={20} color={COLORS.gray[400]} />
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function InstructionRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.instructionRow}>
      <Ionicons name={icon} size={18} color={COLORS.primary} />
      <View style={styles.instructionContent}>
        <Text style={styles.instructionLabel}>{label}</Text>
        <Text style={styles.instructionValue}>{value}</Text>
      </View>
    </View>
  );
}

function TimelineItem({
  label,
  time,
  isActive,
  isCompleted,
  isLast = false,
}: {
  label: string;
  time: string | null;
  isActive: boolean;
  isCompleted: boolean;
  isLast?: boolean;
}) {
  return (
    <View style={styles.timelineItem}>
      <View style={styles.timelineDot}>
        <View
          style={[
            styles.dot,
            isCompleted && styles.dotCompleted,
            isActive && styles.dotActive,
          ]}
        />
        {!isLast && <View style={[styles.line, isCompleted && styles.lineCompleted]} />}
      </View>
      <View style={styles.timelineContent}>
        <Text style={[styles.timelineLabel, isCompleted && styles.timelineLabelCompleted]}>
          {label}
        </Text>
        {time && <Text style={styles.timelineTime}>{time}</Text>}
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
    padding: 16,
    paddingBottom: 32,
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  clientName: {
    fontSize: 24,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  serviceType: {
    fontSize: 16,
    color: COLORS.gray[500],
    marginTop: 4,
  },
  addressContainer: {
    marginTop: 16,
    gap: 12,
  },
  addressRow: {
    flexDirection: 'row',
    gap: 12,
  },
  addressText: {
    flex: 1,
  },
  street: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.gray[900],
  },
  unit: {
    fontSize: 14,
    color: COLORS.gray[600],
  },
  cityState: {
    fontSize: 14,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.gray[500],
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  detailItem: {
    width: '45%',
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    color: COLORS.gray[500],
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: COLORS.gray[900],
  },
  instructionRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[100],
  },
  instructionContent: {
    flex: 1,
  },
  instructionLabel: {
    fontSize: 12,
    color: COLORS.gray[500],
  },
  instructionValue: {
    fontSize: 15,
    color: COLORS.gray[900],
    marginTop: 2,
  },
  timelineItem: {
    flexDirection: 'row',
    minHeight: 48,
  },
  timelineDot: {
    width: 24,
    alignItems: 'center',
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.gray[300],
    borderWidth: 2,
    borderColor: COLORS.gray[200],
  },
  dotCompleted: {
    backgroundColor: COLORS.success,
    borderColor: COLORS.success,
  },
  dotActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  line: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.gray[200],
    marginVertical: 4,
  },
  lineCompleted: {
    backgroundColor: COLORS.success,
  },
  timelineContent: {
    flex: 1,
    paddingLeft: 12,
    paddingBottom: 16,
  },
  timelineLabel: {
    fontSize: 16,
    color: COLORS.gray[500],
  },
  timelineLabelCompleted: {
    color: COLORS.gray[900],
    fontWeight: '500',
  },
  timelineTime: {
    fontSize: 14,
    color: COLORS.gray[400],
    marginTop: 2,
  },
  actionContainer: {
    marginTop: 8,
  },
  completedBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.success + '15',
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  completedText: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.success,
  },
});
