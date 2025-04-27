'use strict';
'require view';
'require poll';
'require fs';
'require rpc';
'require uci';
'require ui';
'require form';

const conf = 'librespeed-go';
const instance = 'librespeed-go';

const callServiceList = rpc.declare({
	object: 'service',
	method: 'list',
	params: ['name'],
	expect: { '': {} }
});

function getServiceStatus() {
	return L.resolveDefault(callServiceList(conf), {})
		.then((res) => {
			let isrunning = false;
			try {
				isrunning = res[conf]['instances'][instance]['running'];
			} catch (e) { }
			return isrunning;
		});
}

return view.extend({
//	handleSaveApply: null,
//	handleSave: null,
//	handleReset: null,

	load() {
	return Promise.all([
		L.resolveDefault(getServiceStatus(), false),
		uci.load('librespeed-go')
	]);
	},

	poll_status(nodes, stat) {
		const isRunning = stat[0];
		let view = nodes.querySelector('#service_status');

		if (isRunning) {
			view.innerHTML = "<span style=\"color:green;font-weight:bold\">" + instance + " - " + _("SERVER RUNNING") + "</span>";
		} else {
			view.innerHTML = "<span style=\"color:red;font-weight:bold\">" + instance + " - " + _("SERVER NOT RUNNING") + "</span>";
		}
		return;
	},

	render(res) {
		const isRunning = res[0];

		let m, s, o;

		m = new form.Map('librespeed-go', _('librespeed Config'));

		s = m.section(form.NamedSection, '_status');
		s.anonymous = true;
		s.render = function (section_id) {
			return E('div', { class: 'cbi-section' }, [
				E('div', { id: 'service_status' }, _('Collecting data ...'))
			]);
		};

		s = m.section(form.NamedSection, 'config', 'librespeed-go');
		s.anonymous = true;

		o = s.option(form.Value, 'listen_port', _('Listen Port'));
		o.datatype = 'port';
		o.default = 8989;
		o.rmempty = false;

		o = s.option(form.Flag, 'enable_http2', _('Enable HTTP2'));
		o.default = o.disabled;
		o.rmempty = false;

		o = s.option(form.Flag, 'enable_tls', _('Enable TLS'));
		o.default = o.disabled;
		o.rmempty = false;
		o.retain = true;
		o.depends('enable_http2', '1');

		o = s.option(form.Value, 'tls_cert_file', _('TLS Cert file'));
		o.placeholder = '/etc/librespeed-go/cert.pem';
		o.rmempty = false;
		o.retain = true;
		o.depends('enable_tls', '1');

		o = s.option(form.Value, 'tls_key_file', _('TLS Key file'));
		o.placeholder = '/etc/librespeed-go/privkey.pem';
		o.rmempty = false;
		o.retain = true;
		o.depends('enable_tls', '1');

		return m.render()
		.then(L.bind(function(m, nodes) {
			poll.add(L.bind(function() {
				return Promise.all([
					L.resolveDefault(getServiceStatus(), false)
				]).then(L.bind(this.poll_status, this, nodes));
			}, this), 3);
			return nodes;
		}, this, m));
	}
});
