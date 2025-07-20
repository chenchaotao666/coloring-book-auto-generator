import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { useToast } from '@/components/ui/toast'
import { apiFetch } from '@/config/api'
import {
  CheckSquare,
  CreditCard,
  Download,
  Eye,
  RefreshCw,
  Search,
  Square,
  Users,
  Calendar,
  DollarSign,
  TrendingUp
} from 'lucide-react'
import React, { useEffect, useState } from 'react'
import * as XLSX from 'xlsx'

const UsersManager = () => {
  // Toast通知
  const { showWarning, showError, showSuccess } = useToast()

  // 状态管理
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [selectedUsers, setSelectedUsers] = useState(new Set())
  
  // 搜索和筛选
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredUsers, setFilteredUsers] = useState([])
  
  // 用户详情对话框
  const [showUserDetail, setShowUserDetail] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  const [userRecharges, setUserRecharges] = useState([])
  const [rechargesLoading, setRechargesLoading] = useState(false)

  // 分页
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const pageSize = 20

  // 加载用户列表
  const loadUsers = async (page = 1) => {
    setLoading(true)
    setError('')
    
    try {
      const response = await apiFetch(`/api/users?page=${page}&limit=${pageSize}`)
      const data = await response.json()
      
      if (data.success) {
        setUsers(data.users || [])
        setCurrentPage(data.currentPage || 1)
        setTotalPages(data.totalPages || 1)
      } else {
        setError(data.message || '获取用户列表失败')
      }
    } catch (error) {
      console.error('获取用户列表失败:', error)
      setError('获取用户列表失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  // 加载用户充值记录
  const loadUserRecharges = async (userId) => {
    setRechargesLoading(true)
    
    try {
      const response = await apiFetch(`/api/users/${userId}/recharges`)
      const data = await response.json()
      
      if (data.success) {
        setUserRecharges(data.recharges || [])
      } else {
        showError('获取充值记录失败: ' + data.message)
        setUserRecharges([])
      }
    } catch (error) {
      console.error('获取充值记录失败:', error)
      showError('获取充值记录失败: ' + error.message)
      setUserRecharges([])
    } finally {
      setRechargesLoading(false)
    }
  }

  // 初始化加载
  useEffect(() => {
    loadUsers()
  }, [])

  // 搜索过滤
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredUsers(users)
    } else {
      const filtered = users.filter(user => 
        user.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.user_id?.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredUsers(filtered)
    }
  }, [users, searchTerm])

  // 查看用户详情
  const viewUserDetail = async (user) => {
    setSelectedUser(user)
    setShowUserDetail(true)
    await loadUserRecharges(user.user_id)
  }

  // 关闭用户详情
  const closeUserDetail = () => {
    setShowUserDetail(false)
    setSelectedUser(null)
    setUserRecharges([])
  }

  // 全选/取消全选
  const toggleSelectAll = () => {
    if (selectedUsers.size === filteredUsers.length) {
      setSelectedUsers(new Set())
    } else {
      setSelectedUsers(new Set(filteredUsers.map(user => user.user_id)))
    }
  }

  // 切换单个用户选择
  const toggleUserSelection = (userId) => {
    const newSelection = new Set(selectedUsers)
    if (newSelection.has(userId)) {
      newSelection.delete(userId)
    } else {
      newSelection.add(userId)
    }
    setSelectedUsers(newSelection)
  }

  // 格式化日期
  const formatDate = (dateString) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleString('zh-CN')
  }

  // 格式化金额
  const formatAmount = (amount) => {
    if (amount === null || amount === undefined) return '$0.00'
    return `$${parseFloat(amount).toFixed(2)}`
  }

  // 获取状态显示
  const getStatusDisplay = (status) => {
    const statusMap = {
      'pending': { text: '待支付', class: 'bg-yellow-100 text-yellow-800' },
      'success': { text: '成功', class: 'bg-green-100 text-green-800' },
      'failed': { text: '失败', class: 'bg-red-100 text-red-800' },
      'refund': { text: '已退款', class: 'bg-gray-100 text-gray-800' }
    }
    return statusMap[status] || { text: status, class: 'bg-gray-100 text-gray-800' }
  }

  // 获取会员等级显示
  const getMembershipDisplay = (level) => {
    const levelMap = {
      'basic': { text: 'basic', class: 'bg-blue-100 text-blue-800' },
      'premium': { text: 'premium', class: 'bg-purple-100 text-purple-800' },
      'pro': { text: 'pro', class: 'bg-gold-100 text-gold-800' }
    }
    return levelMap[level] || { text: level || 'basic', class: 'bg-gray-100 text-gray-800' }
  }

  // 导出Excel功能
  const exportToExcel = async () => {
    try {
      setLoading(true)
      showSuccess('开始导出用户数据...')

      // 获取所有用户数据（不分页）
      const response = await apiFetch('/api/users?limit=1000000') // 获取所有数据
      const data = await response.json()

      if (!data.success) {
        showError('获取用户数据失败: ' + data.message)
        return
      }

      const allUsers = data.users || []

      // 准备Excel数据
      const excelData = allUsers.map((user, index) => ({
        '序号': index + 1,
        '用户ID': user.user_id,
        '用户名': user.username || '-',
        '邮箱': user.email || '-',
        '角色': user.role || 'user',
        '会员等级': user.membershipLevel || 'basic',
        '积分余额': user.useravailableScore || 0,
        '账户余额': parseFloat(user.balance || 0).toFixed(2),
        '会员到期时间': user.membershipExpiry ? formatDate(user.membershipExpiry) : '-',
        '注册时间': formatDate(user.createdAt),
        '首次登录时间': user.firstlogin_time ? formatDate(user.firstlogin_time) : '-',
        '最后更新时间': formatDate(user.updatedAt)
      }))

      // 创建工作簿
      const wb = XLSX.utils.book_new()
      const ws = XLSX.utils.json_to_sheet(excelData)

      // 设置列宽
      const colWidths = [
        { wch: 8 },  // 序号
        { wch: 32 }, // 用户ID
        { wch: 15 }, // 用户名
        { wch: 25 }, // 邮箱
        { wch: 10 }, // 角色
        { wch: 12 }, // 会员等级
        { wch: 12 }, // 积分余额
        { wch: 12 }, // 账户余额
        { wch: 20 }, // 会员到期时间
        { wch: 20 }, // 注册时间
        { wch: 20 }, // 首次登录时间
        { wch: 20 }  // 最后更新时间
      ]
      ws['!cols'] = colWidths

      // 添加工作表到工作簿
      XLSX.utils.book_append_sheet(wb, ws, '用户列表')

      // 生成文件名（包含当前时间）
      const now = new Date()
      const timestamp = now.toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_')
      const filename = `用户列表_${timestamp}.xlsx`

      // 下载文件
      XLSX.writeFile(wb, filename)

      showSuccess(`Excel文件已导出: ${filename}`)
      console.log(`导出完成: ${allUsers.length} 条用户记录`)

    } catch (error) {
      console.error('导出Excel失败:', error)
      showError('导出Excel失败: ' + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-6 h-6" />
            用户管理
          </h1>
          <p className="text-sm text-gray-600 mt-1">管理系统用户信息和充值记录</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={exportToExcel}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            导出Excel
          </Button>
          <Button
            onClick={() => loadUsers(currentPage)}
            disabled={loading}
            variant="outline"
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
        </div>
      </div>

      {/* 搜索和筛选 */}
      <Card>
        <CardContent className="p-4">
          <div className="flex gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="搜索用户名、邮箱或用户ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="text-sm text-gray-600">
              共 {filteredUsers.length} 个用户
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 错误信息 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* 用户列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>用户列表</span>
            {selectedUsers.size > 0 && (
              <span className="text-sm font-normal text-gray-600">
                已选择 {selectedUsers.size} 个用户
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
              <div className="text-gray-600">加载中...</div>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              {searchTerm ? '没有找到匹配的用户' : '暂无用户数据'}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="border border-gray-200 px-4 py-2 text-left">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={toggleSelectAll}
                        className="h-6 w-6 p-0"
                      >
                        {selectedUsers.size === filteredUsers.length ? (
                          <CheckSquare className="w-4 h-4" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </Button>
                    </th>
                    <th className="border border-gray-200 px-4 py-2 text-left">用户ID</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">用户名</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">邮箱</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">角色</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">会员等级</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">积分余额</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">账户余额</th>
                    <th className="border border-gray-200 px-4 py-2 text-left">注册时间</th>
                    <th className="border border-gray-200 px-4 py-2 text-center">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user.user_id} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => toggleUserSelection(user.user_id)}
                          className="h-6 w-6 p-0"
                        >
                          {selectedUsers.has(user.user_id) ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </Button>
                      </td>
                      <td className="border border-gray-200 px-4 py-2">
                        <span className="font-mono text-xs text-gray-600">
                          {user.user_id.slice(0, 8)}...
                        </span>
                      </td>
                      <td className="border border-gray-200 px-4 py-2">
                        <div className="flex items-center gap-2">
                          {user.avatarUrl && (
                            <img
                              src={user.avatarUrl}
                              alt="头像"
                              className="w-6 h-6 rounded-full"
                              onError={(e) => {
                                e.target.style.display = 'none'
                              }}
                            />
                          )}
                          <span className="font-medium">{user.username || '-'}</span>
                        </div>
                      </td>
                      <td className="border border-gray-200 px-4 py-2">
                        {user.email || '-'}
                      </td>
                      <td className="border border-gray-200 px-4 py-2">
                        <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
                          user.role === 'admin' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role || 'user'}
                        </span>
                      </td>
                      <td className="border border-gray-200 px-4 py-2">
                        {(() => {
                          const level = getMembershipDisplay(user.membershipLevel)
                          return (
                            <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${level.class}`}>
                              {level.text}
                            </span>
                          )
                        })()}
                      </td>
                      <td className="border border-gray-200 px-4 py-2">
                        <span className="font-medium">{user.useravailableScore || 0}</span>
                      </td>
                      <td className="border border-gray-200 px-4 py-2">
                        <span className="font-medium">{formatAmount(user.balance)}</span>
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-sm text-gray-600">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="border border-gray-200 px-4 py-2 text-center">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => viewUserDetail(user)}
                          className="flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          详情
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* 分页 */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-600">
                第 {currentPage} 页，共 {totalPages} 页
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage <= 1 || loading}
                  onClick={() => loadUsers(currentPage - 1)}
                >
                  上一页
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage >= totalPages || loading}
                  onClick={() => loadUsers(currentPage + 1)}
                >
                  下一页
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 用户详情对话框 */}
      <Dialog
        isOpen={showUserDetail}
        onClose={closeUserDetail}
        title="用户详情"
        maxWidth="max-w-6xl"
      >
        <DialogContent>
          {selectedUser && (
            <div className="space-y-6">
              {/* 用户基本信息 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    用户信息
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium text-gray-600">用户ID</label>
                      <div className="font-mono text-sm text-gray-800">{selectedUser.user_id}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">用户名</label>
                      <div className="text-gray-800">{selectedUser.username || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">邮箱</label>
                      <div className="text-gray-800">{selectedUser.email || '-'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">角色</label>
                      <div className="text-gray-800">{selectedUser.role || 'user'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">会员等级</label>
                      <div className="text-gray-800">{selectedUser.membershipLevel || 'basic'}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">积分余额</label>
                      <div className="text-gray-800 font-medium">{selectedUser.useravailableScore || 0}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">账户余额</label>
                      <div className="text-gray-800 font-medium">{formatAmount(selectedUser.balance)}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">会员到期时间</label>
                      <div className="text-gray-800">{formatDate(selectedUser.membershipExpiry)}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">注册时间</label>
                      <div className="text-gray-800">{formatDate(selectedUser.createdAt)}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">首次登录</label>
                      <div className="text-gray-800">{formatDate(selectedUser.firstlogin_time)}</div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600">最后更新</label>
                      <div className="text-gray-800">{formatDate(selectedUser.updatedAt)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* 充值记录 */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="w-5 h-5" />
                    充值记录
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {rechargesLoading ? (
                    <div className="text-center py-4">
                      <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2" />
                      <div className="text-gray-600">加载充值记录中...</div>
                    </div>
                  ) : userRecharges.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      暂无充值记录
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="border border-gray-200 px-4 py-2 text-left">充值ID</th>
                            <th className="border border-gray-200 px-4 py-2 text-left">订单号</th>
                            <th className="border border-gray-200 px-4 py-2 text-left">金额</th>
                            <th className="border border-gray-200 px-4 py-2 text-left">货币</th>
                            <th className="border border-gray-200 px-4 py-2 text-left">状态</th>
                            <th className="border border-gray-200 px-4 py-2 text-left">支付方式</th>
                            <th className="border border-gray-200 px-4 py-2 text-left">套餐类型</th>
                            <th className="border border-gray-200 px-4 py-2 text-left">获得积分</th>
                            <th className="border border-gray-200 px-4 py-2 text-left">创建时间</th>
                          </tr>
                        </thead>
                        <tbody>
                          {userRecharges.map((recharge) => (
                            <tr key={recharge.rechargeId} className="hover:bg-gray-50">
                              <td className="border border-gray-200 px-4 py-2">
                                <span className="font-mono text-xs text-gray-600">
                                  {recharge.rechargeId.slice(0, 8)}...
                                </span>
                              </td>
                              <td className="border border-gray-200 px-4 py-2">
                                <span className="font-mono text-xs">
                                  {recharge.orderId || '-'}
                                </span>
                              </td>
                              <td className="border border-gray-200 px-4 py-2">
                                <span className="font-medium">{formatAmount(recharge.amount)}</span>
                              </td>
                              <td className="border border-gray-200 px-4 py-2">
                                {recharge.currency}
                              </td>
                              <td className="border border-gray-200 px-4 py-2">
                                {(() => {
                                  const status = getStatusDisplay(recharge.status)
                                  return (
                                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${status.class}`}>
                                      {status.text}
                                    </span>
                                  )
                                })()}
                              </td>
                              <td className="border border-gray-200 px-4 py-2">
                                {recharge.method}
                              </td>
                              <td className="border border-gray-200 px-4 py-2">
                                <div className="flex flex-col">
                                  <span className="text-sm">{recharge.chargeType}</span>
                                  <span className="text-xs text-gray-500">{recharge.planCode}</span>
                                </div>
                              </td>
                              <td className="border border-gray-200 px-4 py-2">
                                <span className="font-medium text-green-600">+{recharge.creditsAdded}</span>
                              </td>
                              <td className="border border-gray-200 px-4 py-2 text-sm text-gray-600">
                                {formatDate(recharge.createdAt)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default UsersManager