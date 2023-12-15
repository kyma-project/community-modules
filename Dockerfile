# Use official nginx image as the base image
FROM nginx:latest

# Copy the build output to replace the default nginx contents.
ADD ./dist /usr/share/nginx/html

# Expose port 80
EXPOSE 80