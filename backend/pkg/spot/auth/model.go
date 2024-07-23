package auth

import "github.com/golang-jwt/jwt/v5"

type JWTClaims struct {
	UserId   int `json:"userId"`
	TenantID int `json:"tenantId"`
	jwt.RegisteredClaims
}

type User struct {
	ID          uint64          `json:"id"`
	Name        string          `json:"name"`
	Email       string          `json:"email"`
	TenantID    uint64          `json:"tenantId"`
	JwtIat      int             `json:"jwtIat"`
	Permissions map[string]bool `json:"permissions"`
}

func (u *User) HasPermission(perm string) bool {
	_, ok := u.Permissions[perm]
	return ok
}

func abs(x int) int {
	if x < 0 {
		return -x
	}
	return x
}
