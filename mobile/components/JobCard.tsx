import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Job } from '@/types';
import { COLORS, JOB_STATUS_COLORS } from '@/constants';

interface JobCardProps {
  job: Job;
  onPress: () => void;
}

export function JobCard({ job, onPress }: JobCardProps) {
  const clientName = `${job.client.firstName} ${job.client.lastName}`;
  const address = job.address
    ? `${job.address.street}, ${job.address.city}`
    : 'No address';

  const getStatusLabel = () => {
    if (job.clockedOutAt) return 'Completed';
    if (job.clockedInAt) return 'In Progress';
    if (job.onMyWaySentAt) return 'On My Way';
    return 'Scheduled';
  };

  const getStatusColor = () => {
    if (job.clockedOutAt) return COLORS.success;
    if (job.clockedInAt) return COLORS.warning;
    if (job.onMyWaySentAt) return COLORS.primary;
    return COLORS.gray[400];
  };

  const formatTime = (time: string | null) => {
    if (!time) return '';
    const date = new Date(time);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>
      <View style={styles.header}>
        <View style={styles.clientInfo}>
          <Text style={styles.clientName}>{clientName}</Text>
          <Text style={styles.serviceType}>{job.serviceType}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.statusText}>{getStatusLabel()}</Text>
        </View>
      </View>

      <View style={styles.details}>
        <View style={styles.detailRow}>
          <Ionicons name="location-outline" size={16} color={COLORS.gray[500]} />
          <Text style={styles.detailText} numberOfLines={1}>{address}</Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="time-outline" size={16} color={COLORS.gray[500]} />
          <Text style={styles.detailText}>
            {job.scheduledTime ? formatTime(job.scheduledTime) : 'Flexible'} • {job.duration} min
          </Text>
        </View>

        <View style={styles.detailRow}>
          <Ionicons name="cash-outline" size={16} color={COLORS.gray[500]} />
          <Text style={styles.detailText}>${job.price}</Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Ionicons name="chevron-forward" size={20} color={COLORS.gray[400]} />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginVertical: 6,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  clientInfo: {
    flex: 1,
  },
  clientName: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.gray[900],
  },
  serviceType: {
    fontSize: 14,
    color: COLORS.gray[500],
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.white,
  },
  details: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  detailText: {
    fontSize: 14,
    color: COLORS.gray[600],
    flex: 1,
  },
  footer: {
    position: 'absolute',
    right: 16,
    top: '50%',
  },
});
