package config

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/rsa"
	"crypto/x509"
	"encoding/base64"
	"encoding/pem"
	"io"
	"os"

	"golang.org/x/crypto/ssh"
)

// 加密密钥 (实际应用中应从配置文件读取)
var secretKey = []byte("deploy-master-secret-key-32b")

// EncryptPassword 加密密码
func EncryptPassword(password string) string {
	if password == "" {
		return ""
	}

	block, err := aes.NewCipher(secretKey)
	if err != nil {
		return password
	}

	plaintext := []byte(password)
	ciphertext := make([]byte, aes.BlockSize+len(plaintext))
	iv := ciphertext[:aes.BlockSize]

	if _, err := io.ReadFull(rand.Reader, iv); err != nil {
		return password
	}

	stream := cipher.NewCFBEncrypter(block, iv)
	stream.XORKeyStream(ciphertext[aes.BlockSize:], plaintext)

	return base64.StdEncoding.EncodeToString(ciphertext)
}

// DecryptPassword 解密密码
func DecryptPassword(encrypted string) string {
	if encrypted == "" {
		return ""
	}

	ciphertext, err := base64.StdEncoding.DecodeString(encrypted)
	if err != nil {
		return encrypted
	}

	block, err := aes.NewCipher(secretKey)
	if err != nil {
		return encrypted
	}

	if len(ciphertext) < aes.BlockSize {
		return encrypted
	}

	iv := ciphertext[:aes.BlockSize]
	ciphertext = ciphertext[aes.BlockSize:]

	stream := cipher.NewCFBDecrypter(block, iv)
	stream.XORKeyStream(ciphertext, ciphertext)

	return string(ciphertext)
}

// GenerateSSHKey 生成 SSH 密钥对
func GenerateSSHKey(keyType string, bits int, passphrase string) (privateKey, publicKey string, err error) {
	// 生成 RSA 私钥
	key, err := rsa.GenerateKey(rand.Reader, bits)
	if err != nil {
		return "", "", err
	}

	// 编码私钥 (暂不支持加密，直接导出)
	privateKeyPEM := pem.EncodeToMemory(&pem.Block{
		Type:  "RSA PRIVATE KEY",
		Bytes: x509.MarshalPKCS1PrivateKey(key),
	})

	// 生成公钥
	pub, err := ssh.NewPublicKey(&key.PublicKey)
	if err != nil {
		return "", "", err
	}
	publicKey = string(ssh.MarshalAuthorizedKey(pub))

	return string(privateKeyPEM), publicKey, nil
}

// SaveKeyToFile 保存密钥到文件
func SaveKeyToFile(keyContent, filename string) error {
	return os.WriteFile(filename, []byte(keyContent), 0600)
}