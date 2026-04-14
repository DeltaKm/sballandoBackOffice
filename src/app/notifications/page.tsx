'use client';

import { useState, useEffect } from 'react';
import { useAuthRedirect } from '~/lib/useAuth';
import type { IconType } from 'react-icons';
import {
  FaBell,
  FaPaperPlane,
  FaExclamationTriangle,
  FaClipboardList,
  FaChartBar,
  FaMobileAlt,
  FaDatabase,
  FaUsers,
  FaSearch,
  FaRocket,
  FaBolt,
  FaSyncAlt,
  FaInbox,
  FaCalendarAlt,
  FaChartLine,
  FaUser,
  FaArrowRight,
  FaClock,
  FaBullhorn,
} from 'react-icons/fa';

interface NotificationHistory {
  id: number;
  title: string;
  message: string;
  type: string;
  category: string;
  created_at: string;
  recipients_count: number;
  recipients: Array<{
    id: number;
    name: string;
    surname: string;
    email: string;
    nickname?: string;
  }>;
}

interface NotificationResponse {
  success: boolean;
  notifications: NotificationHistory[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

interface NotificationStats {
  user: {
    id: number;
    name: string;
    surname: string;
    nickname?: string;
    display_name: string;
    followers_count: number;
    following_count: number;
  };
  notifications: {
    total_sent: number;
    recent_sent: number;
    by_type: Record<string, number>;
  };
}

export default function NotificationsPage() {
  const auth = useAuthRedirect();
  const [activeTab, setActiveTab] = useState<'send' | 'history' | 'stats' | 'admin'>('send');
  
  // Form state
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [notificationType, setNotificationType] = useState('general');
  const [sending, setSending] = useState(false);

  // Admin form state
  const [adminTitle, setAdminTitle] = useState('');
  const [adminMessage, setAdminMessage] = useState('');
  const [adminNotificationType, setAdminNotificationType] = useState('announcement');
  const [adminSending, setAdminSending] = useState(false);
  
  // History state
  const [history, setHistory] = useState<NotificationHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  });

  // Stats state
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);

  // Loading check
  if (auth.isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white/80">Caricamento...</p>
        </div>
      </div>
    );
  }

  if (!auth.user) {
    return null; // Redirect will be handled by useAuthRedirect
  }

  // Fetch notification history
  const fetchHistory = async (page = 1) => {
    if (!auth.user?.token) return;
    
    setLoadingHistory(true);
    try {
      const response = await fetch(`/api/notifications/history?user_token=${auth.user.token}&page=${page}&limit=10`);
      const data: NotificationResponse = await response.json();
      
      if (data.success) {
        setHistory(data.notifications);
        setPagination(data.pagination);
      } else {
        console.error('Error fetching history:', data);
      }
    } catch (error) {
      console.error('Error fetching notification history:', error);
    } finally {
      setLoadingHistory(false);
    }
  };

  // Fetch notification stats
  const fetchStats = async () => {
    if (!auth.user?.token) return;
    
    setLoadingStats(true);
    try {
      const response = await fetch(`/api/notifications/stats?user_token=${auth.user.token}`);
      const data = await response.json();
      
      if (data.success) {
        setStats(data.stats);
      } else {
        console.error('Error fetching stats:', data);
      }
    } catch (error) {
      console.error('Error fetching notification stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Load history when switching to history tab
  useEffect(() => {
    if (activeTab === 'history') {
      fetchHistory();
    } else if (activeTab === 'stats') {
      fetchStats();
    }
  }, [activeTab, auth.user?.token]);

  // Send notification
  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !message.trim() || !auth.user?.token) {
      alert('Inserisci titolo e messaggio');
      return;
    }

    setSending(true);
    try {
      const response = await fetch('/api/notifications/send-to-followers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: title.trim(),
          message: message.trim(),
          notification_type: notificationType,
          user_token: auth.user.token
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        setTitle('');
        setMessage('');
        // Refresh history if on history tab
        if (activeTab === 'history') {
          fetchHistory();
        }
        // Refresh stats if on stats tab
        if (activeTab === 'stats') {
          fetchStats();
        }
      } else {
        alert(`Errore: ${result.error}`);
      }
    } catch (error) {
      console.error('Error sending notification:', error);
      alert('Errore durante l\'invio della notifica');
    } finally {
      setSending(false);
    }
  };

  // Send notification to all users (SUPERADMIN only)
  const handleSendAdminNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!adminTitle.trim() || !adminMessage.trim() || !auth.user?.token) {
      alert('Inserisci titolo e messaggio');
      return;
    }

    if (auth.user.role !== 'SUPERADMIN') {
      alert('Solo i SUPERADMIN possono inviare notifiche a tutti gli utenti');
      return;
    }

    const confirmed = confirm(
      `ATTENZIONE!\n\nStai per inviare una notifica a TUTTI gli utenti della piattaforma.\n\nTitolo: "${adminTitle}"\nMessaggio: "${adminMessage}"\n\nSei sicuro di voler procedere?`
    );

    if (!confirmed) return;

    setAdminSending(true);
    try {
      const response = await fetch('/api/notifications/send-to-all-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: adminTitle.trim(),
          message: adminMessage.trim(),
          notification_type: adminNotificationType,
          user_token: auth.user.token
        }),
      });

      const result = await response.json();

      if (result.success) {
        alert(result.message);
        setAdminTitle('');
        setAdminMessage('');
        // Refresh history if on history tab
        if (activeTab === 'history') {
          fetchHistory();
        }
        // Refresh stats if on stats tab
        if (activeTab === 'stats') {
          fetchStats();
        }
      } else {
        alert(`Errore: ${result.error}`);
      }
    } catch (error) {
      console.error('Error sending admin notification:', error);
      alert('Errore durante l\'invio della notifica');
    } finally {
      setAdminSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 inline-flex items-center gap-3">
            <FaBell />
            <span>Centro Notifiche</span>
          </h1>
          <p className="text-white/70 text-lg">
            Invia notifiche push e messaggi ai tuoi follower
          </p>
          <div className="mt-4 flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-green-400 rounded-full"></span>
              <span className="text-white/70">Connesso come: {auth.user.name} {auth.user.surname}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
              <span className="text-white/70">Followers: {stats?.user.followers_count || auth.user.followers_count || 0}</span>
            </div>
            {stats && (
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-purple-400 rounded-full"></span>
                <span className="text-white/70">Notifiche inviate: {stats.notifications.total_sent}</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-white/10 rounded-lg p-1">
            <button
              onClick={() => setActiveTab('send')}
              className={`flex-1 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'send'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <FaPaperPlane />
                <span>Invia ai Follower</span>
              </span>
            </button>
            
            {/* SUPERADMIN Tab */}
            {auth.user?.role === 'SUPERADMIN' && (
              <button
                onClick={() => setActiveTab('admin')}
                className={`flex-1 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                  activeTab === 'admin'
                    ? 'bg-red-600 text-white shadow-sm'
                    : 'text-red-300 hover:text-red-200 hover:bg-red-900/20 border border-red-500/30'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <FaExclamationTriangle />
                  <span>ADMIN - Tutti gli Utenti</span>
                </span>
              </button>
            )}
            
            <button
              onClick={() => setActiveTab('history')}
              className={`flex-1 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'history'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <FaClipboardList />
                <span>Cronologia</span>
              </span>
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 px-4 py-3 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'stats'
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <FaChartBar />
                <span>Statistiche</span>
              </span>
            </button>
          </div>
        </div>

        {/* Send Notification Tab */}
        {activeTab === 'send' && (
          <div className="space-y-8">
            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <FaMobileAlt className="text-3xl" />
                  <h3 className="text-lg font-semibold text-blue-200">Push Notifications</h3>
                </div>
                <p className="text-blue-200/80 text-sm">
                  Le notifiche verranno inviate come push notification sui dispositivi mobili dei tuoi follower
                </p>
              </div>
              
              <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <FaDatabase className="text-3xl" />
                  <h3 className="text-lg font-semibold text-green-200">Database Notifications</h3>
                </div>
                <p className="text-green-200/80 text-sm">
                  Tutte le notifiche vengono salvate nel database e sono consultabili dall'app
                </p>
              </div>
              
              <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-6">
                <div className="flex items-center gap-3 mb-3">
                  <FaUsers className="text-3xl" />
                  <h3 className="text-lg font-semibold text-purple-200">Solo Follower</h3>
                </div>
                <p className="text-purple-200/80 text-sm">
                  Le notifiche vengono inviate esclusivamente ai tuoi follower attivi
                </p>
              </div>
            </div>

            {/* Send Form */}
            <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-8">
              <h2 className="text-2xl font-bold mb-6">Invia Nuova Notifica</h2>
              
              <form onSubmit={handleSendNotification} className="space-y-6">
                {/* Notification Type */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Tipo di Notifica
                  </label>
                  <select
                    value={notificationType}
                    onChange={(e) => setNotificationType(e.target.value)}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                  >
                    <option value="general">Generale</option>
                    <option value="announcement">Annuncio</option>
                    <option value="update">Aggiornamento</option>
                  </select>
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Titolo *
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Inserisci il titolo della notifica..."
                    maxLength={100}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    required
                  />
                  <div className="text-right text-xs text-white/50 mt-1">
                    {title.length}/100
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Messaggio *
                  </label>
                  <textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Scrivi il messaggio della notifica..."
                    rows={5}
                    maxLength={500}
                    className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 resize-none"
                    required
                  />
                  <div className="text-right text-xs text-white/50 mt-1">
                    {message.length}/500
                  </div>
                </div>

                {/* Preview */}
                {title.trim() && message.trim() && (
                  <div className="bg-gray-800/50 border border-gray-500/30 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-white/80 mb-2 inline-flex items-center gap-2"><FaSearch /> <span>Anteprima Notifica</span></h4>
                    <div className="bg-gray-900/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-1 bg-purple-500/30 text-purple-300 rounded">
                          {notificationType.charAt(0).toUpperCase() + notificationType.slice(1)}
                        </span>
                      </div>
                      <h5 className="font-semibold text-white mb-1">{title}</h5>
                      <p className="text-white/70 text-sm">{message}</p>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={sending || !title.trim() || !message.trim()}
                  className={`w-full py-4 rounded-lg font-semibold text-lg transition-all ${
                    sending || !title.trim() || !message.trim()
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02]'
                  }`}
                >
                  {sending ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Invio in corso...
                    </div>
                  ) : (
                    <span className="inline-flex items-center justify-center gap-2">
                      <FaRocket />
                      <span>Invia Notifica ai Follower ({auth.user.followers_count || 0})</span>
                    </span>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* SUPERADMIN Tab - Send to All Users */}
        {activeTab === 'admin' && auth.user?.role === 'SUPERADMIN' && (
          <div className="space-y-8">
            {/* Warning Banner */}
            <div className="bg-red-500/20 border-2 border-red-500/50 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <FaExclamationTriangle className="text-4xl" />
                <div>
                  <h2 className="text-2xl font-bold text-red-200">ZONA AMMINISTRATORE</h2>
                  <p className="text-red-300/80">
                    Questa sezione permette di inviare notifiche a TUTTI gli utenti della piattaforma
                  </p>
                </div>
              </div>
              
              <div className="bg-red-900/30 rounded-lg p-4 mt-4">
                <h3 className="font-semibold text-red-200 mb-2 inline-flex items-center gap-2"><FaBolt /> <span>ATTENZIONE:</span></h3>
                <ul className="text-red-300/80 text-sm space-y-1">
                  <li>• Le notifiche verranno inviate a OGNI utente registrato</li>
                  <li>• Questa azione è irreversibile</li>
                  <li>• Usa questa funzione solo per comunicazioni importanti</li>
                  <li>• Ogni invio viene registrato e tracciato</li>
                </ul>
              </div>
            </div>

            {/* Admin Send Form */}
            <div className="bg-gradient-to-br from-red-500/10 to-orange-500/10 border border-red-500/30 rounded-xl p-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
                <FaExclamationTriangle />
                <span>Invia Notifica Globale</span>
              </h2>
              
              <form onSubmit={handleSendAdminNotification} className="space-y-6">
                {/* Notification Type */}
               

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Titolo Globale *
                  </label>
                  <input
                    type="text"
                    value={adminTitle}
                    onChange={(e) => setAdminTitle(e.target.value)}
                    placeholder="Inserisci il titolo dell'annuncio globale..."
                    maxLength={100}
                    className="w-full px-4 py-3 bg-white/10 border border-red-300/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    required
                  />
                  <div className="text-right text-xs text-white/50 mt-1">
                    {adminTitle.length}/100
                  </div>
                </div>

                {/* Message */}
                <div>
                  <label className="block text-sm font-medium text-white/80 mb-2">
                    Messaggio Globale *
                  </label>
                  <textarea
                    value={adminMessage}
                    onChange={(e) => setAdminMessage(e.target.value)}
                    placeholder="Scrivi il messaggio che verrà inviato a tutti gli utenti..."
                    rows={5}
                    maxLength={500}
                    className="w-full px-4 py-3 bg-white/10 border border-red-300/20 rounded-lg text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                    required
                  />
                  <div className="text-right text-xs text-white/50 mt-1">
                    {adminMessage.length}/500
                  </div>
                </div>

                {/* Preview */}
                {adminTitle.trim() && adminMessage.trim() && (
                  <div className="bg-red-900/30 border border-red-500/30 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-red-200 mb-2 inline-flex items-center gap-2"><FaSearch /> <span>Anteprima Notifica Globale</span></h4>
                    <div className="bg-red-950/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-xs px-2 py-1 bg-red-500/50 text-red-200 rounded">
                          ADMIN - {adminNotificationType.charAt(0).toUpperCase() + adminNotificationType.slice(1)}
                        </span>
                        <span className="text-xs px-2 py-1 bg-orange-500/50 text-orange-200 rounded">
                          GLOBALE
                        </span>
                      </div>
                      <h5 className="font-semibold text-white mb-1">{adminTitle}</h5>
                      <p className="text-white/70 text-sm">{adminMessage}</p>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={adminSending || !adminTitle.trim() || !adminMessage.trim()}
                  className={`w-full py-4 rounded-lg font-semibold text-lg transition-all ${
                    adminSending || !adminTitle.trim() || !adminMessage.trim()
                      ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
                      : 'bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white shadow-lg hover:shadow-xl transform hover:scale-[1.02] border-2 border-red-500/50'
                  }`}
                >
                  {adminSending ? (
                    <div className="flex items-center justify-center gap-3">
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      Invio Globale in corso...
                    </div>
                  ) : (
                    <span className="inline-flex items-center justify-center gap-2">
                      <FaExclamationTriangle />
                      <span>INVIA A TUTTI GLI UTENTI</span>
                    </span>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* History Tab */}
        {activeTab === 'history' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold inline-flex items-center gap-2"><FaClipboardList /> <span>Cronologia Notifiche</span></h2>
              <button
                onClick={() => fetchHistory(1)}
                disabled={loadingHistory}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-2">
                  <FaSyncAlt className={loadingHistory ? 'animate-spin' : ''} />
                  <span>Aggiorna</span>
                </span>
              </button>
            </div>

            {loadingHistory ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white/70">Caricamento cronologia...</p>
              </div>
            ) : history.length === 0 ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
                <FaInbox className="text-6xl mb-4 block mx-auto text-white/60" />
                <h3 className="text-xl font-semibold mb-2">Nessuna notifica inviata</h3>
                <p className="text-white/70">
                  Le notifiche che invierai appariranno qui con tutti i dettagli
                </p>
              </div>
            ) : (
              <>
                {/* History List */}
                <div className="space-y-4">
                  {history.map((notification) => (
                    <div key={notification.id} className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">{notification.title}</h3>
                            <span className="px-2 py-1 bg-purple-500/30 text-purple-300 rounded text-xs">
                              {notification.type}
                            </span>
                          </div>
                          <p className="text-white/70 mb-3">{notification.message}</p>
                          <div className="flex items-center gap-4 text-sm text-white/60">
                            <span className="inline-flex items-center gap-1"><FaUsers /> <span>{notification.recipients_count} destinatar{notification.recipients_count !== 1 ? 'i' : 'io'}</span></span>
                            <span className="inline-flex items-center gap-1"><FaCalendarAlt /> <span>{new Date(notification.created_at).toLocaleString('it-IT')}</span></span>
                          </div>
                        </div>
                      </div>
                      
                      {/* Recipients Preview */}
                      {notification.recipients.length > 0 && (
                        <div className="border-t border-white/10 pt-4">
                          <details className="group">
                            <summary className="cursor-pointer text-sm text-white/70 hover:text-white">
                              <span className="inline-flex items-center gap-2"><FaSearch /> <span>Mostra destinatari ({notification.recipients.length})</span></span>
                            </summary>
                            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                              {notification.recipients.slice(0, 12).map((recipient) => (
                                <div key={recipient.id} className="bg-white/5 rounded-lg p-2 text-sm">
                                  <div className="font-medium">
                                    {recipient.nickname || `${recipient.name} ${recipient.surname}`}
                                  </div>
                                  <div className="text-white/60 text-xs">{recipient.email}</div>
                                </div>
                              ))}
                              {notification.recipients.length > 12 && (
                                <div className="bg-white/5 rounded-lg p-2 text-sm text-center text-white/60">
                                  +{notification.recipients.length - 12} altri
                                </div>
                              )}
                            </div>
                          </details>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div className="flex justify-center items-center gap-4 mt-8">
                    <button
                      onClick={() => fetchHistory(pagination.page - 1)}
                      disabled={!pagination.hasPrev || loadingHistory}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      ← Precedente
                    </button>
                    
                    <span className="text-white/70">
                      Pagina {pagination.page} di {pagination.totalPages}
                    </span>
                    
                    <button
                      onClick={() => fetchHistory(pagination.page + 1)}
                      disabled={!pagination.hasNext || loadingHistory}
                      className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Successiva →
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Statistics Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold inline-flex items-center gap-2"><FaChartBar /> <span>Statistiche Notifiche</span></h2>
              <button
                onClick={fetchStats}
                disabled={loadingStats}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg font-medium transition-colors disabled:opacity-50"
              >
                <span className="inline-flex items-center gap-2">
                  <FaSyncAlt className={loadingStats ? 'animate-spin' : ''} />
                  <span>Aggiorna</span>
                </span>
              </button>
            </div>

            {loadingStats ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-white/70">Caricamento statistiche...</p>
              </div>
            ) : !stats ? (
              <div className="bg-white/5 border border-white/10 rounded-xl p-12 text-center">
                <FaChartLine className="text-6xl mb-4 block mx-auto text-white/60" />
                <h3 className="text-xl font-semibold mb-2">Statistiche non disponibili</h3>
                <p className="text-white/70">
                  Non è stato possibile caricare le statistiche
                </p>
              </div>
            ) : (
              <>
                {/* User Stats Section */}
                <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border border-purple-500/30 rounded-xl p-6">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <FaUser />
                    <span>Profilo Utente</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="bg-white/5 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-400">{stats.user.display_name}</div>
                      <div className="text-sm text-white/70 mt-1">Nome Utente</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-blue-400">{stats.user.followers_count || 0}</div>
                      <div className="text-sm text-white/70 mt-1 inline-flex items-center gap-1"><FaUsers /> <span>Follower</span></div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-green-400">{stats.user.following_count || 0}</div>
                      <div className="text-sm text-white/70 mt-1 inline-flex items-center gap-1"><FaArrowRight /> <span>Following</span></div>
                    </div>
                  </div>
                </div>

                {/* Notification Stats Section */}
                <div className="bg-gradient-to-r from-green-500/10 to-emerald-500/10 border border-green-500/30 rounded-xl p-6">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <FaChartBar />
                    <span>Statistiche Notifiche</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white/5 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-green-400">{stats.notifications.total_sent}</div>
                      <div className="text-sm text-white/70 mt-1 inline-flex items-center gap-1"><FaPaperPlane /> <span>Totale Inviate</span></div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-yellow-400">{stats.notifications.recent_sent}</div>
                      <div className="text-sm text-white/70 mt-1 inline-flex items-center gap-1"><FaClock /> <span>Ultimi 30 giorni</span></div>
                    </div>
                  </div>
                </div>

                {/* Notification Types Breakdown */}
                <div className="bg-gradient-to-r from-orange-500/10 to-red-500/10 border border-orange-500/30 rounded-xl p-6">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <FaClipboardList />
                    <span>Distribuzione per Tipo</span>
                  </h3>
                  {Object.keys(stats.notifications.by_type).length === 0 ? (
                    <div className="text-center py-8">
                      <FaInbox className="text-4xl mb-2 block mx-auto text-white/60" />
                      <p className="text-white/70">Nessuna notifica inviata ancora</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {Object.entries(stats.notifications.by_type).map(([type, count]) => {
                        const percentage = stats.notifications.total_sent > 0 
                          ? Math.round((count / stats.notifications.total_sent) * 100) 
                          : 0;
                        const TypeIcon: IconType = type === 'general' ? FaBullhorn : type === 'announcement' ? FaBullhorn : FaSyncAlt;
                        const typeLabel = type === 'general' ? 'Generale' : type === 'announcement' ? 'Annuncio' : 'Aggiornamento';
                        
                        return (
                          <div key={type} className="bg-white/5 rounded-lg p-4">
                            <div className="flex justify-between items-center mb-2">
                              <span className="font-medium flex items-center gap-2">
                                <TypeIcon /> <span>{typeLabel}</span>
                              </span>
                              <span className="text-lg font-bold">{count}</span>
                            </div>
                            <div className="w-full bg-white/10 rounded-full h-2">
                              <div 
                                className="bg-gradient-to-r from-orange-500 to-red-500 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <div className="text-right text-xs text-white/60 mt-1">
                              {percentage}%
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 border border-indigo-500/30 rounded-xl p-6">
                  <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
                    <FaBolt />
                    <span>Azioni Rapide</span>
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => setActiveTab('send')}
                      className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg p-4 text-left transition-colors group"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <FaRocket className="text-2xl" />
                        <span className="font-semibold group-hover:text-purple-300">Invia Nuova Notifica</span>
                      </div>
                      <p className="text-sm text-white/70">
                        Crea e invia una nuova notifica ai tuoi follower
                      </p>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('history')}
                      className="bg-white/10 hover:bg-white/20 border border-white/20 rounded-lg p-4 text-left transition-colors group"
                    >
                      <div className="flex items-center gap-3 mb-2">
                        <FaClipboardList className="text-2xl" />
                        <span className="font-semibold group-hover:text-blue-300">Visualizza Cronologia</span>
                      </div>
                      <p className="text-sm text-white/70">
                        Consulta tutte le notifiche inviate in precedenza
                      </p>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
