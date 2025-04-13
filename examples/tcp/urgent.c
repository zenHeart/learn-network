#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <sys/socket.h>
#include <signal.h>
#include <fcntl.h>
#include <errno.h>

#define SERVER_PORT 41234
#define SERVER_ADDRESS "127.0.0.1"
#define BUFFER_SIZE 1024

int socket_fd; // Global for signal handler

// Signal handler for urgent data
void handle_urgent_data(int signum)
{
  char buffer[1];
  int n = recv(socket_fd, buffer, 1, MSG_OOB);
  if (n > 0)
  {
    printf("SIGURG handler: Received urgent data: %c\n", buffer[0]);
  }
  else
  {
    perror("SIGURG handler recv error");
  }
}

// Server function
int run_server()
{
  struct sockaddr_in server_addr, client_addr;
  socklen_t client_len = sizeof(client_addr);
  int client_fd;
  char buffer[BUFFER_SIZE] = {0};
  int opt = 1;

  // Create socket
  if ((socket_fd = socket(AF_INET, SOCK_STREAM, 0)) == 0)
  {
    perror("Socket creation failed");
    return -1;
  }

  // Set socket options
  if (setsockopt(socket_fd, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt)))
  {
    perror("setsockopt failed");
    return -1;
  }

  // Prepare sockaddr_in structure
  server_addr.sin_family = AF_INET;
  server_addr.sin_addr.s_addr = INADDR_ANY;
  server_addr.sin_port = htons(SERVER_PORT);

  // Bind
  if (bind(socket_fd, (struct sockaddr *)&server_addr, sizeof(server_addr)) < 0)
  {
    perror("Bind failed");
    return -1;
  }

  // Listen
  if (listen(socket_fd, 3) < 0)
  {
    perror("Listen failed");
    return -1;
  }

  printf("Server listening on port %d\n", SERVER_PORT);

  // Accept connection
  if ((client_fd = accept(socket_fd, (struct sockaddr *)&client_addr, &client_len)) < 0)
  {
    perror("Accept failed");
    return -1;
  }

  printf("Connection accepted from %s:%d\n",
         inet_ntoa(client_addr.sin_addr), ntohs(client_addr.sin_port));

  // Set up signal handler for urgent data
  signal(SIGURG, handle_urgent_data);

  // Configure socket for SIGURG signals
  if (fcntl(client_fd, F_SETOWN, getpid()) < 0)
  {
    perror("fcntl F_SETOWN failed");
  }

  socket_fd = client_fd; // Update global for signal handler

  // Wait for data
  printf("Waiting for data...\n");

  // Read normal data first
  int valread = recv(client_fd, buffer, BUFFER_SIZE, 0);
  if (valread > 0)
  {
    printf("Received normal data: %s\n", buffer);
  }

  // Explicitly try to receive OOB data as well (in addition to SIGURG handler)
  char oob_buffer[1];
  if (recv(client_fd, oob_buffer, 1, MSG_OOB) > 0)
  {
    printf("Explicitly received OOB data: %c\n", oob_buffer[0]);
  }

  // Check if there's more normal data
  memset(buffer, 0, BUFFER_SIZE);
  valread = recv(client_fd, buffer, BUFFER_SIZE, 0);
  if (valread > 0)
  {
    printf("Received more normal data: %s\n", buffer);
  }

  // // Close sockets
  close(client_fd);
  close(socket_fd);

  return 0;
}

// Client function
int run_client()
{
  int sock = 0;
  struct sockaddr_in serv_addr;
  char *normal_data = "This is normal data.";
  char *normal_data2 = "This is more normal data.";
  char *urgent_data = "!"; // Urgent data is typically a single byte

  if ((sock = socket(AF_INET, SOCK_STREAM, 0)) < 0)
  {
    printf("\nSocket creation error\n");
    return -1;
  }

  memset(&serv_addr, 0, sizeof(serv_addr));
  serv_addr.sin_family = AF_INET;
  serv_addr.sin_port = htons(SERVER_PORT);

  if (inet_pton(AF_INET, SERVER_ADDRESS, &serv_addr.sin_addr) <= 0)
  {
    printf("\nInvalid address/ Address not supported\n");
    return -1;
  }

  printf("Connecting to %s:%d...\n", SERVER_ADDRESS, SERVER_PORT);

  struct timeval tv;
  tv.tv_sec = 3; // 3 seconds timeout
  tv.tv_usec = 0;
  setsockopt(sock, SOL_SOCKET, SO_RCVTIMEO, (const char *)&tv, sizeof(tv));
  setsockopt(sock, SOL_SOCKET, SO_SNDTIMEO, (const char *)&tv, sizeof(tv));

  if (connect(sock, (struct sockaddr *)&serv_addr, sizeof(serv_addr)) < 0)
  {
    printf("\nConnection Failed. Make sure server is running\n");
    return -1;
  }
  printf("Connected successfully!\n");

  // Send normal data first
  if (send(sock, normal_data, strlen(normal_data), 0) < 0)
  {
    perror("Failed to send normal data");
  }
  else
  {
    printf("Sent normal data: %s\n", normal_data);
  }

  // Send urgent data after normal data
  if (send(sock, urgent_data, strlen(urgent_data), MSG_OOB) < 0)
  {
    perror("Failed to send urgent data");
  }
  else
  {
    printf("Sent urgent data: %s\n", urgent_data);
  }

  // Send more normal data after OOB data
  usleep(100000); // 100ms
  if (send(sock, normal_data2, strlen(normal_data2), 0) < 0)
  {
    perror("Failed to send more normal data");
  }
  else
  {
    printf("Sent more normal data: %s\n", normal_data2);
  }

  // Wait to ensure server processes all data
  sleep(1);

  close(sock);
  return 0;
}

int main(int argc, char *argv[])
{
  if (argc < 2)
  {
    printf("No mode specified, defaulting to server mode\n");
    return run_server();
  }

  if (strcmp(argv[1], "server") == 0)
  {
    return run_server();
  }
  else if (strcmp(argv[1], "client") == 0)
  {
    return run_client();
  }
  else
  {
    printf("Unknown option: %s\n", argv[1]);
    printf("Usage: %s [server|client]\n", argv[0]);
    return 1;
  }
}
