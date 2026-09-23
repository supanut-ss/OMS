sc create AUTHENTICATION_SERVICE binPath= "C:\AuthenService\authenservice.exe"
sc description AUTHENTICATION_SERVICE "auto check revoked refresh token"
sc start AUTHENTICATION_SERVICE