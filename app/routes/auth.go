package routes

import (
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"

	"cockpit/database"
	"cockpit/middleware"
	"cockpit/models"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Avatar upload directory
const (
	AvatarUploadDir = "uploads/avatars"
	MaxAvatarSize   = 10 * 1024 * 1024 // 10MB max avatar size
)

// AuthRoutes 认证路由
func AuthRoutes(r *gin.RouterGroup, db *gorm.DB) {
	auth := r.Group("/auth")

	// 公开路由（无需认证）
	auth.POST("/login", loginHandler(db))
	auth.POST("/refresh", refreshTokenHandler(db))

	// 需要认证的路由
	auth.Use(middleware.JWTAuthMiddleware(db))
	auth.POST("/logout", logoutHandler)
	auth.GET("/me", getCurrentUserHandler)
	auth.PUT("/password", updatePasswordHandler(db))
	auth.PUT("/profile", updateProfileHandler(db))
	auth.POST("/avatar", uploadAvatarHandler(db))
}

// loginHandler 登录处理
func loginHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.LoginRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": "Invalid request parameters",
				"data":    nil,
			})
			return
		}

		// 查找用户
		user, err := database.GetUserByUsername(req.Username)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": "Internal server error",
				"data":    nil,
			})
			return
		}

		if user == nil {
			// 记录审计日志
			recordAuditLog(db, nil, req.Username, "login", "user", 0, "登录失败：用户不存在", c, "failed")
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    401,
				"message": "Invalid username or password",
				"data":    nil,
			})
			return
		}

		// 检查账号是否被锁定
		if user.IsLocked() {
			recordAuditLog(db, &user.ID, user.Username, "login", "user", user.ID, "登录失败：账号已锁定", c, "failed")
			c.JSON(http.StatusForbidden, gin.H{
				"code":    403,
				"message": "Account is locked, please try again later",
				"data":    nil,
			})
			return
		}

		// 检查账号是否激活
		if !user.IsActive {
			recordAuditLog(db, &user.ID, user.Username, "login", "user", user.ID, "登录失败：账号已禁用", c, "failed")
			c.JSON(http.StatusForbidden, gin.H{
				"code":    403,
				"message": "Account is disabled",
				"data":    nil,
			})
			return
		}

		// 验证密码
		if !middleware.CheckPassword(req.Password, user.PasswordHash) {
			// 记录失败尝试
			database.RecordLoginAttempt(user.ID, false)
			recordAuditLog(db, &user.ID, user.Username, "login", "user", user.ID, "登录失败：密码错误", c, "failed")
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    401,
				"message": "Invalid username or password",
				"data":    nil,
			})
			return
		}

		// 登录成功，生成 Token
		tokenPair, err := middleware.GenerateTokenPair(user)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": "Failed to generate token",
				"data":    nil,
			})
			return
		}

		// 更新最后登录信息
		clientIP := c.ClientIP()
		database.UpdateLastLogin(user.ID, clientIP)

		// 记录审计日志
		recordAuditLog(db, &user.ID, user.Username, "login", "user", user.ID, "登录成功", c, "success")

		c.JSON(http.StatusOK, gin.H{
			"code":    0,
			"message": "Login successful",
			"data":    tokenPair,
		})
	}
}

// refreshTokenHandler 刷新 Token
func refreshTokenHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.RefreshRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": "Invalid request parameters",
				"data":    nil,
			})
			return
		}

		// 解析 refresh token
		userID, err := middleware.ParseRefreshToken(req.RefreshToken)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    401,
				"message": "Invalid or expired refresh token",
				"data":    nil,
			})
			return
		}

		// 查找用户
		user, err := database.GetUserByID(userID)
		if err != nil || user == nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    401,
				"message": "User not found",
				"data":    nil,
			})
			return
		}

		// 检查账号状态
		if !user.IsActive {
			c.JSON(http.StatusForbidden, gin.H{
				"code":    403,
				"message": "Account is disabled",
				"data":    nil,
			})
			return
		}

		// 生成新的 Token
		tokenPair, err := middleware.GenerateTokenPair(user)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": "Failed to generate token",
				"data":    nil,
			})
			return
		}

		c.JSON(http.StatusOK, gin.H{
			"code":    0,
			"message": "Token refreshed successfully",
			"data":    tokenPair,
		})
	}
}

// logoutHandler 登出处理
func logoutHandler(c *gin.Context) {
	// JWT 是无状态的，登出只需客户端删除 Token
	// 如果需要服务端失效，可以将 Token 加入黑名单（使用 Redis）

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "Logout successful",
		"data":    nil,
	})
}

// getCurrentUserHandler 获取当前用户信息
func getCurrentUserHandler(c *gin.Context) {
	user := middleware.GetCurrentUser(c)
	if user == nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"code":    401,
			"message": "Unauthorized",
			"data":    nil,
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"code":    0,
		"message": "success",
		"data":    user.ToResponse(),
	})
}

// updatePasswordHandler 更新密码
func updatePasswordHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req models.UpdatePasswordRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": "Invalid request parameters",
				"data":    nil,
			})
			return
		}

		user := middleware.GetCurrentUser(c)
		if user == nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    401,
				"message": "Unauthorized",
				"data":    nil,
			})
			return
		}

		// 验证旧密码
		if !middleware.CheckPassword(req.OldPassword, user.PasswordHash) {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": "Current password is incorrect",
				"data":    nil,
			})
			return
		}

		// 更新密码
		if err := database.UpdateUserPassword(user.ID, req.NewPassword); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": "Failed to update password",
				"data":    nil,
			})
			return
		}

		// 记录审计日志
		recordAuditLog(db, &user.ID, user.Username, "update_password", "user", user.ID, "修改密码成功", c, "success")

		c.JSON(http.StatusOK, gin.H{
			"code":    0,
			"message": "Password updated successfully",
			"data":    nil,
		})
	}
}

// recordAuditLog 记录审计日志
func recordAuditLog(db *gorm.DB, userID *uint, username, action, resource string, resourceID uint, detail string, c *gin.Context, status string) {
	log := &models.AuditLog{
		UserID:     userID,
		Username:   username,
		Action:     action,
		Resource:   resource,
		ResourceID: resourceID,
		Detail:     detail,
		SourceIP:   c.ClientIP(),
		UserAgent:  c.GetHeader("User-Agent"),
		Status:     status,
		CreatedAt:  time.Now(),
	}

	// 异步写入审计日志
	go func() {
		database.CreateAuditLog(log)
	}()
}

// UpdateProfileRequest 更新个人资料请求
type UpdateProfileRequest struct {
	Username *string `json:"username,omitempty" binding:"omitempty,min=3,max=50"`
	Email    *string `json:"email,omitempty" binding:"omitempty,email"`
	Phone    *string `json:"phone,omitempty" binding:"omitempty,max=20"`
}

// updateProfileHandler 更新个人资料（用户自己修改）
func updateProfileHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		var req UpdateProfileRequest
		if err := c.ShouldBindJSON(&req); err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"code":    400,
				"message": "请求参数错误: " + err.Error(),
				"data":    nil,
			})
			return
		}

		user := middleware.GetCurrentUser(c)
		if user == nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    401,
				"message": "未授权",
				"data":    nil,
			})
			return
		}

		// 如果要修改用户名，检查是否已存在
		if req.Username != nil && *req.Username != user.Username {
			exists, err := database.CheckUserExists(*req.Username)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"code":    500,
					"message": "检查用户名失败",
					"data":    nil,
				})
				return
			}
			if exists {
				c.JSON(http.StatusBadRequest, gin.H{
					"code":    400,
					"message": "用户名已存在",
					"data":    nil,
				})
				return
			}
			user.Username = *req.Username
		}

		// 更新其他字段
		if req.Email != nil {
			user.Email = *req.Email
		}
		if req.Phone != nil {
			user.Phone = *req.Phone
		}

		// 保存更新
		if err := database.UpdateUser(user); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": "更新个人资料失败",
				"data":    nil,
			})
			return
		}

		// 记录审计日志
		recordAuditLog(db, &user.ID, user.Username, "update_profile", "user", user.ID, "更新个人资料", c, "success")

		c.JSON(http.StatusOK, gin.H{
			"code":    0,
			"message": "个人资料更新成功",
			"data":    user.ToResponse(),
		})
	}
}

// uploadAvatarHandler 上传头像
func uploadAvatarHandler(db *gorm.DB) gin.HandlerFunc {
	return func(c *gin.Context) {
		user := middleware.GetCurrentUser(c)
		if user == nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"code":    401,
				"message": "未授权",
				"data":    nil,
			})
			return
		}

		// 支持两种上传方式：multipart/form-data 和 base64 JSON
		var avatarURL string

		// 检查是否是 multipart 上传
		file, _, err := c.Request.FormFile("avatar")
		if err == nil {
			// multipart 文件上传
			defer file.Close()

			// 检查文件大小
			c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, MaxAvatarSize)
			if _, err := io.Copy(io.Discard, c.Request.Body); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"code":    400,
					"message": "文件大小超过限制（最大2MB）",
					"data":    nil,
				})
				return
			}

			// 创建上传目录
			if err := os.MkdirAll(AvatarUploadDir, 0755); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"code":    500,
					"message": "创建上传目录失败",
					"data":    nil,
				})
				return
			}

			// 生成文件名
			filename := fmt.Sprintf("%d_%d.jpg", user.ID, time.Now().Unix())
		 filepath := filepath.Join(AvatarUploadDir, filename)

			// 保存文件
			dst, err := os.Create(filepath)
			if err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"code":    500,
					"message": "保存文件失败",
					"data":    nil,
				})
				return
			}
			defer dst.Close()

			if _, err := io.Copy(dst, file); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"code":    500,
					"message": "写入文件失败",
					"data":    nil,
				})
				return
			}

			avatarURL = "/" + filepath
		} else {
			// 尝试 base64 JSON 上传
			var req struct {
				Avatar string `json:"avatar" binding:"required"`
			}
			if err := c.ShouldBindJSON(&req); err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"code":    400,
					"message": "请提供有效的头像数据",
					"data":    nil,
				})
				return
			}

			// 解析 base64 数据
			base64Data := req.Avatar
			// 移除 data:image/xxx;base64, 前缀
			if strings.Contains(base64Data, ";base64,") {
				parts := strings.Split(base64Data, ";base64,")
				if len(parts) == 2 {
					base64Data = parts[1]
				}
			}

			imageData, err := base64.StdEncoding.DecodeString(base64Data)
			if err != nil {
				c.JSON(http.StatusBadRequest, gin.H{
					"code":    400,
					"message": "Base64解码失败",
					"data":    nil,
				})
				return
			}

			// 检查大小
			if len(imageData) > MaxAvatarSize {
				c.JSON(http.StatusBadRequest, gin.H{
					"code":    400,
					"message": "图片大小超过限制（最大2MB）",
					"data":    nil,
				})
				return
			}

			// 创建上传目录
			if err := os.MkdirAll(AvatarUploadDir, 0755); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"code":    500,
					"message": "创建上传目录失败",
					"data":    nil,
				})
				return
			}

			// 生成文件名
			filename := fmt.Sprintf("%d_%d.jpg", user.ID, time.Now().Unix())
			filepath := filepath.Join(AvatarUploadDir, filename)

			// 保存文件
			if err := os.WriteFile(filepath, imageData, 0644); err != nil {
				c.JSON(http.StatusInternalServerError, gin.H{
					"code":    500,
					"message": "保存文件失败",
					"data":    nil,
				})
				return
			}

			avatarURL = "/" + filepath
		}

		// 删除旧头像文件（如果存在且不是外部URL）
		if user.Avatar != "" && strings.HasPrefix(user.Avatar, "/uploads/avatars/") {
			oldFile := strings.TrimPrefix(user.Avatar, "/")
			if _, err := os.Stat(oldFile); err == nil {
				os.Remove(oldFile)
			}
		}

		// 更新用户头像URL
		user.Avatar = avatarURL
		if err := database.UpdateUser(user); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"code":    500,
				"message": "更新头像失败",
				"data":    nil,
			})
			return
		}

		// 记录审计日志
		recordAuditLog(db, &user.ID, user.Username, "update_avatar", "user", user.ID, "更新头像", c, "success")

		c.JSON(http.StatusOK, gin.H{
			"code":    0,
			"message": "头像上传成功",
			"data": gin.H{
				"avatar": avatarURL,
				"user":   user.ToResponse(),
			},
		})
	}
}
