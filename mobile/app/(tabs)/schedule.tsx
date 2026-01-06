import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  SectionList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useJobs } from '@/hooks/useJobs';
import { JobCard, EmptyState } from '@/components';
import { COLORS } from '@/constants';
import { Job } from '@/types';

interface Section {
  title: string;
  data: Job[];
}

export default function ScheduleScreen() {
  const { jobs, isLoading, error, refresh } = useJobs();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleJobPress = (job: Job) => {
    router.push(`/job/${job.id}`);
  };

  const groupJobsByDate = (jobs: Job[]): Section[] => {
    const grouped: { [key: string]: Job[] } = {};

    jobs.forEach((job) => {
      const date = new Date(job.scheduledDate);
      const dateKey = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      });

      if (!grouped[dateKey]) {
        grouped[dateKey] = [];
      }
      grouped[dateKey].push(job);
    });

    return Object.entries(grouped)
      .sort((a, b) => {
        const dateA = new Date(a[1][0].scheduledDate);
        const dateB = new Date(b[1][0].scheduledDate);
        return dateA.getTime() - dateB.getTime();
      })
      .map(([title, data]) => ({ title, data }));
  };

  if (isLoading && !refreshing) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <EmptyState
          icon="alert-circle-outline"
          title="Something went wrong"
          message={error}
        />
      </View>
    );
  }

  const sections = groupJobsByDate(jobs);

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <JobCard job={item} onPress={() => handleJobPress(item)} />
        )}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
          </View>
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={COLORS.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            icon="calendar-outline"
            title="No upcoming jobs"
            message="You don't have any scheduled jobs at the moment."
          />
        }
        contentContainerStyle={styles.listContent}
        stickySectionHeadersEnabled={false}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.gray[50],
  },
  centered: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.gray[50],
  },
  listContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  sectionHeader: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
    backgroundColor: COLORS.gray[50],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[700],
  },
});
