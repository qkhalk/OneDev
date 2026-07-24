'use client'

import {
  FileJson, Link2, Table, Binary, KeyRound, Hash, Fingerprint, Globe, Clock, QrCode,
  RefreshCw, Copy, Trash2, Check, ArrowLeftRight, ArrowRight, Loader2, Zap, AlertCircle,
  Search, ArrowLeft, X, ChevronLeft, Bell, Settings, Command, Plus, Mail,
  Lock, Clock as ClockIcon, ExternalLink, BarChart3, Upload, Download,
  Folder, File, ChevronRight, Home, Cloud, HardDrive, Server, Activity,
  Terminal, Shield, Wifi, Database, Code, Bot, Sparkles, Send, Inbox,
  Trash, Eye, EyeOff, MoreVertical, Menu, Filter, ArrowUpRight, TrendingUp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

const iconMap: Record<string, LucideIcon> = {
  FileJson, Link2, Table, Binary, KeyRound, Hash, Fingerprint, Globe, Clock, QrCode,
  RefreshCw, Copy, Trash2, Check, ArrowLeftRight, ArrowRight, Loader2, Zap, AlertCircle,
  Search, ArrowLeft, X, ChevronLeft, Bell, Settings, Command, Plus, Mail,
  Lock, ClockIcon, ExternalLink, BarChart3, Upload, Download,
  Folder, File, ChevronRight, Home, Cloud, HardDrive, Server, Activity,
  Terminal, Shield, Wifi, Database, Code, Bot, Sparkles, Send, Inbox,
  Trash, Eye, EyeOff, MoreVertical, Menu, Filter, ArrowUpRight, TrendingUp,
}

interface IconProps {
  name: string
  size?: number
  className?: string
  style?: React.CSSProperties
  strokeWidth?: number
}

export function Icon({ name, size = 18, className, style, strokeWidth = 2 }: IconProps) {
  const LucideComp = iconMap[name] || FileJson
  return <LucideComp size={size} className={className} style={style} strokeWidth={strokeWidth} />
}

export default Icon
