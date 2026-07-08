FROM node:24.2.0-alpine3.22 as react-build
LABEL maintainer "Krateo <contact@krateo.io>"

ARG VERSION

WORKDIR /app
COPY . ./
RUN npm install
RUN npm version $VERSION
ENV NODE_OPTIONS=--max_old_space_size=4096
RUN npm run build

# remove config folder that is used for local development
#in production a volume is mounted in the container
RUN rm -r dist/config 

# server environment
FROM bitnami/nginx

COPY --from=react-build /app/dist /app

ENV PORT 8080
EXPOSE 8080
# COPY nginx.conf /opt/bitnami/nginx/conf/server_blocks/my_server_block.conf
COPY nginx.conf /opt/bitnami/nginx/conf/bitnami/location.conf
COPY docker-entrypoint.sh /docker-entrypoint.sh
# entrypoint rewrites the resolver placeholder in location.conf at boot; make both runnable/writable
# by the non-root bitnami user (uid 1001, group 0).
USER root
RUN chmod +x /docker-entrypoint.sh && chmod g+rw /opt/bitnami/nginx/conf/bitnami/location.conf
USER 1001
CMD ["/docker-entrypoint.sh"]
