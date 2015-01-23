#!/usr/bin/env python

import json
from mimetypes import guess_type
import os
from re import findall
import subprocess


from flask import abort, make_response
from werkzeug.datastructures import Headers

import app_config
import copytext
from flask import Blueprint
from render_utils import BetterJSONEncoder, flatten_app_config

static = Blueprint('static', __name__)

# Render JST templates on-demand
@static.route('/js/templates.js')
def _templates_js():
    r = subprocess.check_output(["node_modules/universal-jst/bin/jst.js", "--template", "underscore", "jst"])

    return make_response(r, 200, { 'Content-Type': 'application/javascript' })

# Render LESS files on-demand
@static.route('/less/<string:filename>')
def _less(filename):
    if not os.path.exists('less/%s' % filename):
        abort(404)

    r = subprocess.check_output(["node_modules/less/bin/lessc", "less/%s" % filename])

    return make_response(r, 200, { 'Content-Type': 'text/css' })

# Render application configuration
@static.route('/js/app_config.js')
def _app_config_js():
    config = flatten_app_config()
    js = 'window.APP_CONFIG = ' + json.dumps(config, cls=BetterJSONEncoder)

    return make_response(js, 200, { 'Content-Type': 'application/javascript' })

# Render copytext
@static.route('/js/copy.js')
def _copy_js():
    copy = 'window.COPY = ' + copytext.Copy(app_config.COPY_PATH).json()

    return make_response(copy, 200, { 'Content-Type': 'application/javascript' })


# Audio route to serve range headers for Safari.
@static.route('/assets/audio/<string:filename>')
def audio(filename):
    from flask import Response, request

    path = 'www/assets/audio/%s' % filename
    with open(path) as f:
        headers = Headers()
        headers.add('Content-Disposition', 'attachment', filename=filename)
        headers.add('Content-Transfer-Encoding','binary')

        status = 200
        size = os.path.getsize(path)
        begin = 0
        end = size - 1

        if request.headers.has_key('Range'):
            ranges = findall(r'\d+', request.headers['Range'])
            begin = int(ranges[0])
            if len(ranges) > 1:
                end = int(ranges[1])

            if begin != 0 or end != size - 1:
                status = 206
                headers.add('Accept-Ranges', 'bytes')
                headers.add('Content-Range', 'bytes %i-%i/%i' % (begin, end, end - begin) )

        headers.add('Content-Length', str( (end - begin) + 1) )

        response = Response(
            file(path),
            status = status,
            mimetype = 'application/octet-stream',
            headers = headers,
            direct_passthrough = True
        )

        return response

# Server arbitrary static files on-demand
@static.route('/<path:path>')
def _static(path):
    try:
        with open('www/%s' % path) as f:
            return make_response(f.read(), 200, { 'Content-Type': guess_type(path)[0] })
    except IOError:
        abort(404)
