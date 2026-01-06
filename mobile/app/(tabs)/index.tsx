import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { useJobs } from '@/hooks/useJobs';
import { JobCard, EmptyState } from '@/components';
import { COLORS } from '@/constants';
import { Job } from '@/types';

export default function DashboardScreen() {
  const { todayJobs, upcomingJobs, isLoading, error, refresh } = useJobs();
  const [refreshing, setRefreshing] = React.useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  };

  const handleJobPress = (job: Job) => {
    router.push(`/job/${job.id}`);
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });

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

  const sections = [
    { title: "Today's Jobs", data: todayJobs },
    { title: 'Upcoming', data: upcomingJobs.slice(0, 5) },
  ];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.date}>{today}</Text>
        <Text style={styles.summary}>
          {todayJobs.length} job{todayJobs.length !== 1 ? 's' : ''} today
        </Text>
      </View>

      <FlatList
        data={todayJobs}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <JobCard job={item} onPress={() => handleJobPress(item)} />
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
            title="No jobs today"
            message="You have no scheduled jobs for today. Enjoy your day off!"
          />
        }
        ListFooterComponent={
          upcomingJobs.length > 0 ? (
            <View style={styles.upcomingSection}>
              <Text style={styles.sectionTitle}>Upcoming Jobs</Text>
              {upcomingJobs.slice(0, 3).map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onPress={() => handleJobPress(job)}
                />
              ))}
            </View>
          ) : null
        }
        contentContainerStyle={styles.listContent}
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
  header: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.gray[200],
  },
  date: {
    fontSize: 14,
    color: COLORS.gray[500],
  },
  summary: {
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.gray[900],
    marginTop: 4,
  },
  listContent: {
    paddingVertical: 8,
    flexGrow: 1,
  },
  upcomingSection: {
    marginTop: 24,
    paddingBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray[700],
    marginLeft: 16,
    marginBottom: 8,
  },
});
