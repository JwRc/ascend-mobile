import { useLocalSearchParams } from 'expo-router';
import { SupportTicketDetailScreen } from '@/components/support/SupportTicketDetailScreen';

export default function CoachSupportTicketScreen() {
  const { ticketId } = useLocalSearchParams<{ ticketId: string }>();
  return <SupportTicketDetailScreen ticketId={ticketId ?? ''} />;
}
