
## Docker

``` bash
docker run -it --rm -p 3000:3000 -v /var/run/docker.sock:/var/run/docker.sock -v $(pwd):/app -w /app node:12-alpine sh -c "npm install && npm run build && npm start"
```


``` bash
docker run --detach=true \
    --name=web-terminal \
    --net=host \
    --restart=always \
    impossible98/web-terminal
```

```
docker run --detach=true \
    --name=web-terminal \
    --net=host \
    impossible98/web-terminal
```