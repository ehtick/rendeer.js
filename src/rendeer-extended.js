//main namespace
(function(global){


/* This file includes
 * PointCloud: to render points
 * ParticleEmissor: to render basic particles
 * Billboard: to render screen aligned plane
 * SpritesBatch

*/

/**
* PointCloud renders an array of points
* @class PointCloud
* @constructor
*/

/*
function PointCloud()  
{
	this._ctor();
	
	this.points = [];
	this.max_points = 1000;
	
	this.draw_range = [0,this.max_points*3];
	this.shader = "pointcloud";
	this.textures = { color: "white" };
	this.blend_mode = RD.BLEND_ALPHA;
	this.flags.depth_write = false;
	this.render_priority = RD.PRIORITY_ALPHA;
	
	this.num_textures = 1; //atlas number of rows and columns

	this.points_size = 100;
	
	this._uniforms = {
			u_pointSize: this.points_size,
			u_texture_info: vec2.fromValues(1,1)
		};
	
	this.primitive = gl.POINTS;
	this._vertices = new Float32Array( this.max_points * 3 );
	this._extra = new Float32Array( this.max_points * 3 );
	
	this._meshes = {}; 

	this._accumulated_time = 0;
	this._last_point_id = 0;
}

extendClass( PointCloud, RD.SceneNode );
RD.PointCloud = PointCloud;

PointCloud.prototype.render = function(renderer, camera )
{
	if(this.points.length == 0)
		return;
	
	this.updateVertices();
	
	//we can have several meshes if we have more than one context
	var mesh = this._meshes[ renderer.gl.context_id ];
	
	if(!mesh)
	{
		mesh = new GL.Mesh( undefined,undefined, renderer.gl );
		this._vertices_buffer = mesh.createVertexBuffer("vertices", null, 3, this._vertices, gl.DYNAMIC_DRAW );
		this._extra_buffer = mesh.createVertexBuffer("extra3", null, 3, this._extra, gl.DYNAMIC_DRAW );
	}
	this._mesh = mesh;
	
	
	this._vertices_buffer.uploadRange(0, this.points.length * 3 * 4); //4 bytes per float
	this._extra_buffer.uploadRange(0, this.points.length * 3 * 4); //4 bytes per float
	
	var shader = gl.shaders[ this.shader ];
	if(!shader)
	{
		shader = gl.shaders["pointcloud"];
		if(!shader)
			gl.shaders["pointcloud"] = new GL.Shader( PointCloud._vertex_shader, PointCloud._pixel_shader );
	}
	
	this.draw_range[1] = this.points.length;
	var viewport = gl.getViewport();
	this._uniforms.u_pointSize = this.points_size / (gl.canvas.width / viewport[2]);
	this._uniforms.u_color = this.color;
	if(this.num_textures > 0)
	{
		this._uniforms.u_texture_info[0] = 1 / this.num_textures;
		this._uniforms.u_texture_info[1] = this.num_textures * this.num_textures;
	}
	else
		this._uniforms.u_texture_info[0] = 0;
	
	if(this.ignore_transform)
	{
		mat4.identity( renderer._model_matrix );
		renderer._mvp_matrix.set( renderer._viewprojection_matrix );
	}
	renderer.renderNode( this, renderer, camera );
}

PointCloud.prototype.updateVertices = function(mesh)
{
	//update mesh
	var l = this.points.length;
	if(!l)
		return;
	var vertices = this._vertices;
	var extra = this._extra;
	var pos = 0;
	var num_textures2 = this.num_textures * this.num_textures;
	for(var i = 0; i < l; i++)
	{
		var p = this.points[i];
		vertices.set( p.pos ? p.pos : p, pos );
		extra[pos] = 1;
		extra[pos+1] = 1;
		if(num_textures2 > 1)
			extra[pos+2] = p.tex;
		pos+=3;
	}
}

PointCloud._vertex_shader = '\
			precision highp float;\
			attribute vec3 a_vertex;\
			attribute vec3 a_extra3;\
			varying vec2 v_coord;\
			varying vec4 v_color;\
			varying vec3 v_position;\
			uniform vec3 u_camera_position;\
			uniform mat4 u_mvp;\
			uniform mat4 u_model;\
			uniform vec4 u_color;\
			uniform float u_pointSize;\
			uniform vec2 u_texture_info;\
			void main() {\n\
				v_color = u_color;\n\
				v_color.a *= a_extra3.y;\n\
				v_coord.x = (a_extra3.z * u_texture_info.y) * u_texture_info.x;\n\
				v_coord.y = abs(floor(v_coord.x) * u_texture_info.x);\n\
				v_coord.x = fract(v_coord.x);\n\
				gl_Position = u_mvp * vec4(a_vertex,1.0);\n\
				v_position = (u_model * vec4(a_vertex,1.0)).xyz;\n\
				float dist = distance( u_camera_position, v_position );\n\
				gl_PointSize = 10.0 * u_pointSize / dist;\n\
			}\
			';
PointCloud._pixel_shader = '\
			precision highp float;\
			varying vec4 v_color;\
			varying vec2 v_coord;\
			varying vec3 v_position;\
			uniform sampler2D u_color_texture;\
			uniform vec2 u_texture_info;\
			void main() {\
			  vec2 uv = vec2(v_coord.x + gl_PointCoord.x * u_texture_info.x, v_coord.y + (1.0 - gl_PointCoord.y) * u_texture_info.x );\n\
			  vec4 color = texture2D( u_color_texture, uv );\n\
			  color.xyz *= v_color.xyz;\n\
			  #ifdef USE_PROCESS_COLOR\n\
				USE_PROCESS_COLOR\n\
			  #endif\n\
			  gl_FragColor = vec4( color.xyz, color.a * v_color.a );\n\
			}\
		';
*/

//This node allows to render a mesh where vertices are changing constantly
//Used for particles
class DynamicMeshNode extends RD.SceneNode
{
	constructor(o){
		super();
		this.build();
		if(o)
			this.fromJSON(o);
	}
}

DynamicMeshNode.prototype.build = function()
{
	this.vertices = [];
	this.normals = [];
	this.coords = [];
	this.indices = [];

	var size = 1024;
	this._vertices_data = new Float32Array( size * 3 );
	this._normals_data = null;
	this._coords_data = null;
	this._indices_data = null;
	this._total = 0;
	this._total_indices = 0;
	this._mesh = GL.Mesh.load({ vertices: this._vertices_data });
}

DynamicMeshNode.prototype.updateVertices = function( vertices )
{
	if(vertices)
		this.vertices = vertices;
	this._total = this.vertices.length;
	if( this._vertices_data.length < this.vertices.length )
	{
		this._vertices_data = new Float32Array( this.vertices.length * 2 );
		this._mesh.getBuffer("vertices").data = this._vertices_data;
	}
	this._vertices_data.set( this.vertices );
	this._mesh.getBuffer("vertices").upload( GL.STREAM_DRAW );
}

DynamicMeshNode.prototype.updateNormals = function( normals )
{
	if(normals)
		this.normals = normals;
	if( !this._normals_data || this._normals_data.length < this.normals.length )
	{
		this._normals_data = new Float32Array( this.normals.length * 2 );
		var buffer = this._mesh.getBuffer("normals");
		if(!buffer)
			this._mesh.createVertexBuffer("normals",null,3,this._normals_data, GL.STREAM_DRAW);
	}
	this._normals_data.set( this.normals );
	this._mesh.getBuffer("normals").upload( GL.STREAM_DRAW );
}

DynamicMeshNode.prototype.updateCoords = function( coords )
{
	if(coords)
		this.coords = coords;
	if( !this._coords_data || this._coords_data.length < this.normals.length )
	{
		this._coords_data = new Float32Array( this.coords.length * 2 );
		var buffer = this._mesh.getBuffer("coords");
		if(!buffer)
			this._mesh.createVertexBuffer("coords",null,2,this._coords_data, GL.STREAM_DRAW);
	}
	this._coords_data.set( this.coords );
	this._mesh.getBuffer("coords").upload( GL.STREAM_DRAW );
}

DynamicMeshNode.prototype.updateIndices = function( indices )
{
	if(indices)
		this.indices = indices;
	if( !this._indices_data || this._indices_data.length < this.indices.length )
	{
		this._indices_data = new Float32Array( this.indices.length * 2 );
		var buffer = this._mesh.getIndexBuffer("triangles");
		if(!buffer)
			this._mesh.createIndicesBuffer( "triangles",this._indices_data, GL.STREAM_DRAW );
	}
	this._indices_data.set( this.indices );
	this._mesh.getIndexBuffer("triangles").upload( GL.STREAM_DRAW );
	this._total_indices = indices.length;
}

DynamicMeshNode.prototype.preRender = function()
{
	if(!this._total)
		return;
	var mesh = this._mesh;
	var range = this._total_indices ? this._total_indices : this._total / 3;
	this.draw_range = [0, range];
	//shader.uniforms( renderer._uniforms ).uniforms( this._uniforms ).drawRange( mesh, this.primitive == null ? GL.TRIANGLES : this.primitive, , this._total_indices ? "triangles" : null );
}

RD.DynamicMeshNode = DynamicMeshNode;




/**
* ParticlesEmissor renders points and animate them as particles
* @class ParticlesEmissor
* @constructor
*/
function ParticlesEmissor()  
{
	this._ctor();
	
	this.particles = [];
	this.max_particles = 1000;
	
	this.draw_range = [0,this.max_particles*3];
	this.shader = "particles";
	this.textures = { color: "white" };
	this.blend_mode = RD.BLEND_ALPHA;
	this.flags.depth_write = false;
	this.render_priority = RD.PRIORITY_ALPHA;
	
	this.num_textures = 1; //atlas number of rows and columns

	this.particles_size = 100;
	this.particles_per_second = 5;
	this.particles_life = 5;
	this.particles_damping = 0.5;
	this.particles_acceleration = vec3.create(); //use it for gravity and stuff
	this.particles_start_scale = 1;
	this.particles_end_scale = 1;
	this.velocity_variation = 1;
	this.emissor_direction = vec3.fromValues(0,1,0);
	
	this._uniforms = {
			u_pointSize: this.particle_size,
			u_scaleStartEnd: vec2.fromValues(1,1),
			u_texture_info: vec2.fromValues(1,1)
		};
	
	this.primitive = gl.POINTS;
	this._vertices = new Float32Array( this.max_particles * 3 );
	this._extra = new Float32Array( this.max_particles * 3 );
	
	this._meshes = {};
	
	this._accumulated_time = 0;
	this._last_particle_id = 0;
}

extendClass( ParticlesEmissor, RD.SceneNode );
RD.ParticlesEmissor = ParticlesEmissor;

ParticlesEmissor.prototype.update = function(dt)
{
	var l = this.particles.length;
	var damping = this.particles_damping;
	var acc = this.particles_acceleration;
	var forces = vec3.length(acc);
	if(l)
	{
		//update every particle alive (remove the dead ones)
		var alive = [];
		for(var i = 0; i < l; i++)
		{
			var p = this.particles[i];
			vec3.scaleAndAdd( p.pos, p.pos, p.vel, dt );
			if(forces)
				vec3.scaleAndAdd( p.vel, p.vel, acc, dt );
			if(damping)
				vec3.scaleAndAdd( p.vel, p.vel, p.vel, -dt * damping );
			p.ttl -= dt;
			if(p.ttl > 0)
				alive.push(p);
		}
		this.particles = alive;
	}

	//Create new ones	
	var pos = this.getGlobalPosition();
	var vel = this.emissor_direction;
	var life = this.particles_life;
	var num_textures2 = this.num_textures * this.num_textures;
	var velocity_variation = this.velocity_variation;
	
	if(this.particles_per_second > 0)
	{
		var particles_to_create = this.particles_per_second * (dt + this._accumulated_time);
		this._accumulated_time = (particles_to_create - Math.floor( particles_to_create )) / this.particles_per_second;
		particles_to_create = Math.floor( particles_to_create );
		for(var i = 0; i < particles_to_create; i++)
		{
			if(this.particles.length >= this.max_particles)
				break;
			var vel = vec3.clone(vel);
			vel[0] += Math.random() * 0.5 * velocity_variation;
			vel[2] += Math.random() * 0.5 * velocity_variation;
			this.particles.push({id: this._last_particle_id++, tex: Math.floor(Math.random() * num_textures2) / num_textures2, pos: vec3.clone(pos), vel: vel, ttl: life});
		}
	}
}

ParticlesEmissor.prototype.render = function(renderer, camera )
{
	if(this.particles.length == 0)
		return;
	
	this.updateVertices();
	
	//we can have several meshes if we have more than one context
	var mesh = this._meshes[ renderer.gl.context_id ];
	
	if(!mesh)
	{
		mesh = new GL.Mesh( undefined,undefined, renderer.gl );
		this._vertices_buffer = mesh.createVertexBuffer("vertices", null, 3, this._vertices, gl.DYNAMIC_DRAW );
		this._extra_buffer = mesh.createVertexBuffer("extra3", null, 3, this._extra, gl.DYNAMIC_DRAW );
	}
	this._mesh = mesh;	
	
	this._vertices_buffer.uploadRange(0, this.particles.length * 3 * 4); //4 bytes per float
	this._extra_buffer.uploadRange(0, this.particles.length * 3 * 4); //4 bytes per float
	
	var shader = gl.shaders[ this.shader ];
	if(!shader)
	{
		shader = gl.shaders["particles"];
		if(!shader)
			gl.shaders["particles"] = new GL.Shader(ParticlesEmissor._vertex_shader, ParticlesEmissor._pixel_shader);
	}
	
	this.draw_range[1] = this.particles.length;
	var viewport = gl.getViewport();
	this._uniforms.u_pointSize = this.particles_size / (gl.canvas.width / viewport[2]);
	this._uniforms.u_color = this.color;
	this._uniforms.u_texture_info[0] = 1 / this.num_textures;
	this._uniforms.u_texture_info[1] = this.num_textures * this.num_textures;
	this._uniforms.u_scaleStartEnd[0] = this.particles_start_scale;
	this._uniforms.u_scaleStartEnd[1] = this.particles_end_scale;
	mat4.identity( renderer._model_matrix );
	renderer._mvp_matrix.set( renderer._viewprojection_matrix );
	renderer.renderNode( this, renderer, camera );
}

ParticlesEmissor.prototype.updateVertices = function(mesh)
{
	//update mesh
	var l = this.particles.length;
	if(!l)
		return;
	var vertices = this._vertices;
	var extra = this._extra;
	var pos = 0;
	var life = this.particles_life;
	var num_textures2 = this.num_textures * this.num_textures;
	for(var i = 0; i < l; i++)
	{
		var p = this.particles[i];
		vertices.set( p.pos, pos );
		extra[pos] = 1;
		extra[pos+1] = p.ttl / life;
		if(num_textures2 > 1)
			extra[pos+2] = p.tex;
		pos+=3;
	}
}

/*
ParticlesEmissor._vertex_shader = '\
			precision highp float;\
			attribute vec3 a_vertex;\
			attribute vec3 a_extra3;\
			varying vec2 v_coord;\
			varying vec4 v_color;\
			varying vec3 v_position;\
			uniform vec3 u_camera_position;\
			uniform mat4 u_mvp;\
			uniform mat4 u_model;\
			uniform vec4 u_color;\
			uniform float u_pointSize;\
			uniform vec2 u_texture_info;\
			uniform vec2 u_scaleStartEnd;\
			void main() {\n\
				v_color = u_color;\n\
				v_color.a *= a_extra3.y;\n\
				v_coord.x = (a_extra3.z * u_texture_info.y) * u_texture_info.x;\n\
				v_coord.y = floor(v_coord.x) * u_texture_info.x;\n\
				v_coord.x = fract(v_coord.x);\n\
				gl_Position = u_mvp * vec4(a_vertex,1.0);\n\
				v_position = (u_model * vec4(a_vertex,1.0)).xyz;\n\
				float dist = distance( u_camera_position, v_position );\n\
				gl_PointSize = mix(u_scaleStartEnd.y, u_scaleStartEnd.x, a_extra3.y) * 10.0 * u_pointSize / dist;\n\
			}\
			';
ParticlesEmissor._pixel_shader = '\
			precision highp float;\
			varying vec4 v_color;\
			varying vec2 v_coord;\
			varying vec3 v_position;\
			uniform sampler2D u_color_texture;\
			uniform vec2 u_texture_info;\
			void main() {\
			  vec4 color = texture2D( u_color_texture, v_coord + vec2(gl_PointCoord.x,1.0 - gl_PointCoord.y) * u_texture_info.x );\n\
			  color.xyz *= v_color.xyz;\n\
			  #ifdef USE_PROCESS_COLOR\n\
				USE_PROCESS_COLOR\n\
			  #endif\n\
			  gl_FragColor = vec4( color.xyz, color.a * v_color.a );\n\
			}\
		';
*/

/**
* Billboard class to hold an scene item, used for camera aligned objects
* @class Billboard
* @constructor
*/
function Billboard()  
{
	this._ctor();
}

extendClass( Billboard, RD.SceneNode );
RD.Billboard = Billboard;

Billboard.SPHERIC = 1;
Billboard.PARALLEL_SPHERIC = 2;
Billboard.CYLINDRIC = 3;
Billboard.PARALLEL_CYLINDRIC = 4;

Billboard.prototype._ctor = function()
{
	this.billboard_mode = Billboard.SPHERIC;
	this.auto_orient = true;
	RD.SceneNode.prototype._ctor.call(this);
}

Billboard.prototype.render = function(renderer, camera )
{
	//avoid orienting if it is not visible
	if(this.flags.visible === false)
		return;
	if(this.auto_orient)
		RD.orientNodeToCamera( this.billboard_mode, this, camera, renderer );
	renderer.renderNode( this, renderer, camera );
}

/**
* Sprite class , inherits from SceneNode but helps to render 2D planes (in 3D Space)
* @class Sprite
* @constructor
*/
function Sprite(o)
{
	this._ctor();
	if(o)
		this.configure(o);
}

Sprite.prototype._ctor = function()
{
	SceneNode.prototype._ctor.call(this);

	this.mesh = "plane";
	this.size = vec2.fromValues(0,0); //size of the 
	this.sprite_pivot = RD.TOP_LEFT;
	this.blend_mode = RD.BLEND_ALPHA;
	this.flags.two_sided = true;
	this.flags.flipX = false;
	this.flags.flipY = false;
	this.flags.pixelated = false;
	//this.flags.depth_test = false;
	this.shader = "texture_transform";
	this._angle = 0;

	this.frame = null;
	this.frames = {};
	this.texture_matrix = mat3.create();
	
	this._uniforms["u_texture_matrix"] = this.texture_matrix;
}

Object.defineProperty(Sprite.prototype, 'angle', {
	get: function() { return this._angle; },
	set: function(v) { this._angle = v; quat.setAxisAngle( this._rotation, RD.FRONT, this._angle * DEG2RAD ); this._must_update_matrix = true; },
	enumerable: true //avoid problems
});

Sprite.prototype.setSize = function(w,h)
{
	this.size[0] = w;
	this.size[1] = h;
}

//static version
//num is the number of elements per row and column, if array then [columns,rows]
Sprite.createFrames = function( num, names, frames )
{
	frames = frames || {};
	var num_rows;
	var num_colums;
	if(num.constructor != Number)
	{
		num_columns = num[0];
		num_rows = num[1];
	}
	else
		num_rows = num_columns = num;

	var x = 0;
	var y = 0;
	var offsetx = 1/num_columns;
	var offsety = 1/num_rows;
	var total = num_columns * num_rows;

	if(!names)
	{
		names = [];
		for(var i = 0; i < total; ++i)
			names.push( String(i) );
	}

	for( var i = 0; i < names.length; ++i )
	{
		frames[ names[i] ] = { pos:[x,y], size:[offsetx,offsety], normalized: true };
		x += offsetx;
		if(x >= 1)
		{
			x = 0;
			y += offsety;
		}
		if(y >= 1)
			return frames;
	}
	return frames;
}

Sprite.prototype.createFrames = function(num, names)
{
	Sprite.createFrames(num, names, this.frames );
}

Sprite.prototype.addFrame = function(name, x,y, w,h, normalized )
{
	this.frames[ name ] = { pos: vec2.fromValues(x,y), size: vec2.fromValues(w,h), normalized: !!normalized };
}

Sprite.prototype.updateTextureMatrix = function( renderer )
{
	mat3.identity( this.texture_matrix );
	//no texture
	if(!this.texture)
		return false;
	
	var texture = renderer.textures[ this.texture ];
	if(!texture && renderer.autoload_assets) 
	{
		var that = this;
		if(this.texture.indexOf(".") != -1)
			renderer.loadTexture( this.texture, renderer.default_texture_settings, function(tex){
				if(tex && that.size[0] == 0 && that.size[0] == 0 )
					that.setSize( tex.width, tex.height );	
			});
		texture = gl.textures[ "white" ];
	}
	if(!texture) //texture not found
		return false;
		
	//adapt texture matrix
	var matrix = this.texture_matrix;
		
	var frame = this.current_frame = this.frames[ this.frame ];
	
	//frame not found
	if(this.frame !== null && !frame)
		return false;
	
	if(!frame)
	{
		if(this.flags.flipX)
		{
			temp_vec2[0] = this.flags.flipX ? 1 : 0; 
			temp_vec2[1] = 0;
			mat3.translate( matrix, matrix, temp_vec2 );
			temp_vec2[0] = (this.flags.flipX ? -1 : 1); 
			temp_vec2[1] = 1;
			mat3.scale( matrix, matrix, temp_vec2 );
		}
		return true;
	}
	
	if(frame.normalized)
	{
		temp_vec2[0] = this.flags.flipX ? frame.pos[0] + frame.size[0] : frame.pos[0]; 
		temp_vec2[1] = 1 - frame.pos[1] - frame.size[1];
		mat3.translate( matrix, matrix, temp_vec2 );
		temp_vec2[0] = frame.size[0] * (this.flags.flipX ? -1 : 1); 
		temp_vec2[1] = frame.size[1];
		mat3.scale( matrix, matrix, temp_vec2 );
	}
	else
	{
		var tw = texture.width;
		var th = texture.height;
		temp_vec2[0] = (this.flags.flipX ? frame.pos[0] + frame.size[0] : frame.pos[0]) / tw; 
		temp_vec2[1] = (th - frame.pos[1] - frame.size[1]) / th;
		mat3.translate( matrix, matrix, temp_vec2 );
		temp_vec2[0] = (frame.size[0] * (this.flags.flipX ? -1 : 1)) / texture.width; 
		temp_vec2[1] = frame.size[1] / texture.height;
		mat3.scale( matrix, matrix, temp_vec2 );
	}
	
	return true;
}

Sprite.prototype.render = function(renderer, camera)
{
	if(!this.texture)
		return;	

	//this autoloads
	if(!this.updateTextureMatrix(renderer)) //texture or frame not found
		return;

	var tex = renderer.textures[ this.texture ];
	if(!tex)
		return;
	
	if( this.flags.pixelated )
	{
		tex.bind(0);
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.flags.pixelated ? gl.NEAREST : gl.LINEAR );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.flags.pixelated ? gl.NEAREST_MIPMAP_NEAREST : gl.LINEAR_MIPMAP_LINEAR );
	}

	if(this.billboard_mode)
		RD.orientNodeToCamera( this.billboard_mode, this, camera, renderer );
	if(this.size[0] == 0 && tex.ready !== false)
		this.size[0] = tex.width;
	if(this.size[1] == 0 && tex.ready !== false)
		this.size[1] = tex.height;
	var size = this.size;
	var offsetx = 0;
	var offsety = 0;
	temp_mat4.set( this._global_matrix );

	var normalized_size = false;
	if(this.current_frame && this.current_frame.size)
	{
		size = this.current_frame.size;
		normalized_size = this.current_frame.normalized;
	}

	if (this.sprite_pivot)
	{
		switch( this.sprite_pivot )
		{
			//case RD.CENTER: break;
			case RD.TOP_LEFT: offsetx = 0.5; offsety = -0.5; break;
			case RD.TOP_CENTER: offsety = -0.5; break;
			case RD.TOP_RIGHT: offsetx = -0.5; break;
			case RD.BOTTOM_LEFT: offsetx = 0.5; offsety = 0.5; break;
			case RD.BOTTOM_CENTER: offsety = 0.5; break;
			case RD.BOTTOM_RIGHT: offsetx = -0.5; offsety = 0.5; break;
		}
		mat4.translate( temp_mat4, temp_mat4, [offsetx * tex.width * size[0], offsety * tex.height * size[1], 0 ] );
	}
	
	//mat4.scale( temp_mat4, temp_mat4, [size[0] * (normalized_size ? this.size[0] : 1), size[1] * (normalized_size ? this.size[1] : 1), 1 ] );
	if(normalized_size)
		mat4.scale( temp_mat4, temp_mat4, [tex.width * size[0], tex.height * size[1], 1 ] );
		//mat4.scale( temp_mat4, temp_mat4, [this.size[0] * size[0], this.size[1] * size[1], 1 ] );
	else
		mat4.scale( temp_mat4, temp_mat4, [this.size[0], this.size[1], 1 ] );
	renderer.setModelMatrix( temp_mat4 );

	renderer.renderNode( this, renderer, camera );
}

/*
Sprite.renderSprite = function( renderer, camera, position, texture, frame_index, atlas_size, scale, billboard_mode, pivot )
{
	if(!texture)
		return;	

	//this autoloads
	if(!this.updateTextureMatrix(renderer)) //texture or frame not found
		return;

	if(billboard_mode)
		RD.orientNodeToCamera( billboard_mode, this, camera, renderer );

	var offsetx = 0;
	var offsety = 0;
	temp_mat4.set( this._global_matrix );

	if (pivot)
	{
		switch( pivot )
		{
			//case RD.CENTER: break;
			case RD.TOP_LEFT: offsetx = 0.5; offsety = -0.5; break;
			case RD.TOP_CENTER: offsety = -0.5; break;
			case RD.TOP_RIGHT: offsetx = -0.5; break;
			case RD.BOTTOM_LEFT: offsetx = 0.5; offsety = 0.5; break;
			case RD.BOTTOM_CENTER: offsety = 0.5; break;
			case RD.BOTTOM_RIGHT: offsetx = -0.5; offsety = 0.5; break;
		}
		mat4.translate( temp_mat4, temp_mat4, [offsetx * w, offsety * h, 0 ] );
	}
	renderer.setModelMatrix( temp_mat4 );
	renderer.renderNode( this, renderer, camera );
}
*/

extendClass( Sprite, RD.SceneNode );
RD.Sprite = Sprite;

/**
* To render several sprites from a texture atlas
* It can be used as a scene node or a helper class
* @class SpritesBatch
* @constructor
*/
/*
function SpritesBatch(o)
{
	this._ctor();
	if(o)
		this.configure(o);
}

SpritesBatch.prototype._ctor = function()
{
	RD.SceneNode.prototype._ctor.call(this);

	this.size = 1; //world units 
	this._atlas_size = vec2.fromValues(1,1); //num columns and rows in the spritebatch atlas
	this.max_sprites = 1024;
	this.positions = new Float32Array(this.max_sprites*3); //positions
	this.sprite_info = new Float32Array(this.max_sprites*4); //sprite info [ frame, flipx, scale, extra_num ]
	this.index = 0;
	this.shader = null;
	this.use_points = false;
	this.mode = SpritesBatch.CYLINDRICAL;
	this.must_update_buffers = true;
}

RD.SpritesBatch = SpritesBatch;

SpritesBatch.XY = 0;
SpritesBatch.XZ = 1;
SpritesBatch.CYLINDRICAL = 2;
SpritesBatch.SPHERICAL = 3;
SpritesBatch.FLAT = 4;

Object.defineProperty( SpritesBatch.prototype, "atlas_size",{
	get: function(){return this._atlas_size;},
	set: function(v){this._atlas_size.set(v);}
});

SpritesBatch.prototype.clear = function()
{
	this.index = 0;
}

//adds one sprite, 
SpritesBatch.prototype.add = function( position, frame, flipx, scale, extra_num )
{
	if( this.max_sprites <= this.index )
	{
		console.warn("too many sprites in batch, increase size");
		return;
	}
	var index = this.index;
	this.index += 1;
	this.positions.set( position, index*3 );
	if( position.length == 2 )
		this.positions[index*3+2] = 0;
	var i = index*4;
	this.sprite_info[i] = frame || 0;
	this.sprite_info[i+1] = flipx ? 1 : 0;
	this.sprite_info[i+2] = scale == null ? 1 : scale;
	this.sprite_info[i+3] = extra_num || 0;
	this.must_update_buffers = true;
}

SpritesBatch.prototype.addData = function( pos, extra )
{
	if( this.max_sprites <= this.index )
	{
		console.warn("too many sprites in batch, increase size");
		return;
	}
	var index = this.index;
	this.index += 1;
	this.positions.set( pos, index*3 );
	this.sprite_info.set( extra, index*4 );
	this.must_update_buffers = true;
}

SpritesBatch.prototype.render = function(renderer, camera)
{
	if(!this.texture)
		return;	

	var tex = renderer.textures[ this.texture ];
	if(tex && this.flags.pixelated )
	{
		tex.bind(0);
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, this.flags.pixelated ? gl.NEAREST : gl.LINEAR );
		gl.texParameteri( gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, this.flags.pixelated ? gl.NEAREST_MIPMAP_NEAREST : gl.LINEAR_MIPMAP_LINEAR );
	}

	this.renderSprites( tex, camera, this.size, this.atlas_size, this.color, this.mode );
}

//mode allows to orient them
SpritesBatch.prototype.renderSprites = function( texture, camera, size, atlas_size, color, mode )
{
	if(!this.index) //no sprites
		return;

	var shader = gl.shaders[ this.shader ];

	if(!shader)
		shader = gl.shaders[ this.use_points ? "point_sprites" : "quad_sprites" ];

	if(!shader)
	{
		if(this.use_points)
			shader = gl.shaders[ "point_sprites" ] = new GL.Shader( SpritesBatch.point_sprites_vertex_shader, SpritesBatch.point_sprites_fragment_shader );
		else
			shader = gl.shaders[ "quad_sprites" ] = new GL.Shader( SpritesBatch.quad_sprites_vertex_shader, SpritesBatch.quad_sprites_fragment_shader );
	}

	mode = mode || 0;

	if( this.use_points )
	{
		shader.uniforms( GFX.scene_renderer._uniforms );
		shader.setUniform( "u_pointSize", size );
		shader.setUniform( "u_atlas", atlas_size );
		shader.setUniform( "u_texture", texture.bind(0) );
		RD.renderPoints( this.positions, this.sprite_info, camera, this.index, shader );
		return;
	}

	//using quads
	if(!this.vertex_buffer_data)
	{
		this.vertex_buffer_data = new Float32Array( this.max_sprites * 3 * 4 ); //4 vertex per quad
		this.extra4_buffer_data = new Float32Array( this.max_sprites * 4 * 4 ); //4 vertex per quad
		var extra2_data = new Int8Array( this.max_sprites * 2 * 4 ); //for inflation direction, could be shared among spritesheets
		var quad_data = new Int8Array([-1,1, 1,1, -1,-1, 1,-1]);
		for(var i = 0; i < extra2_data.length; i += 8 )
			extra2_data.set( quad_data, i );
		var indices_data = new Int16Array([0,2,1, 1,2,3]);
		var indices_buffer_data = new Uint16Array( this.max_sprites * 3 * 2); //3 indices, 2 triangles
		for(var i = 0; i < indices_buffer_data.length; ++i )
			indices_buffer_data[i] = indices_data[i%6] + Math.floor(i/6)*4;
		this.vertex_buffer = new GL.Buffer( gl.ARRAY_BUFFER, this.vertex_buffer_data, 3, gl.DYNAMIC_DRAW );
		this.extra4_buffer = new GL.Buffer( gl.ARRAY_BUFFER, this.extra4_buffer_data, 4, gl.DYNAMIC_DRAW );
		this.extra2_buffer = new GL.Buffer( gl.ARRAY_BUFFER, extra2_data, 2, gl.STATIC_DRAW );
		this.indices_buffer = new GL.Buffer( gl.ELEMENT_ARRAY_BUFFER, indices_buffer_data, 1, gl.STATIC_DRAW );
	}

	if( this.must_update_buffers )
	{
		var vertices = this.vertex_buffer_data;
		var extra4 = this.extra4_buffer_data;
		var end = Math.min( this.index, this.positions.length / 3);
		for(var i = 0, l = end; i < l; ++i )
		{
			var index = i*3;
			var pos = this.positions.subarray( index, index + 3 );
			vertices.set( pos, index*4 );
			vertices.set( pos, index*4 + 3 );
			vertices.set( pos, index*4 + 6 );
			vertices.set( pos, index*4 + 9 );
			var index = i*4;
			var info = this.sprite_info.subarray( index, index + 4 );
			extra4.set( info, index*4 );
			extra4.set( info, index*4 + 4 );
			extra4.set( info, index*4 + 8 );
			extra4.set( info, index*4 + 12 );
		}

		//upload subarray
		this.vertex_buffer.uploadRange(0, this.index * 3 * 4 * 4 );
		this.extra4_buffer.uploadRange(0, this.index * 4 * 4 * 4 );
		//this.vertex_buffer.upload();
		//this.extra4_buffer.upload();
		this.must_update_buffers = false;
	}

	var frame_width = (texture.width / atlas_size[0]);
	var frame_height = (texture.height / atlas_size[1]);
	var aspect = frame_width / frame_height;

	var top = RD.UP;
	var right = RD.RIGHT;

	switch( mode )
	{
		case RD.SpritesBatch.SPHERICAL: top = camera.getLocalVector( RD.UP ); //break not missing
		case RD.SpritesBatch.CYLINDRICAL: right = camera.getLocalVector( RD.RIGHT ); break;
		case RD.SpritesBatch.FLAT: top = camera.getLocalVector( RD.FRONT ); right = camera.getLocalVector( RD.RIGHT ); break;
		case RD.SpritesBatch.XZ: top = RD.FRONT; break;
	};

	//render
	shader.bind();
	shader.setUniform("u_model", RD.IDENTITY );
	shader.setUniform("u_viewprojection", camera._viewprojection_matrix );
	shader.setUniform("u_color", color || RD.ONES4 );
	shader.setUniform("u_size", [size, size / aspect] );
	shader.setUniform("u_top", top );
	shader.setUniform("u_right", right );
	shader.setUniform( "u_atlas", atlas_size );
	shader.setUniform( "u_texture", texture.bind(0) );
	shader.setUniform( "u_itexsize", [ 1 / texture.width, 1 / texture.height ] );
	shader.setUniform( "u_viewport", gl.viewport_data );

	var loc1 = shader.attributes["a_vertex"];
	var loc2 = shader.attributes["a_extra4"];
	var loc3 = shader.attributes["a_extra2"];
	this.vertex_buffer.bind( loc1 );
	this.extra4_buffer.bind( loc2 );
	this.extra2_buffer.bind( loc3 );
	gl.bindBuffer( gl.ELEMENT_ARRAY_BUFFER, this.indices_buffer.buffer );
	gl.drawElements( gl.TRIANGLES, this.index * 6, gl.UNSIGNED_SHORT, 0);
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);
	this.vertex_buffer.unbind( loc1 );
	this.extra4_buffer.unbind( loc2 );
	this.extra2_buffer.unbind( loc3 );
}


extendClass( SpritesBatch, RD.SceneNode );


SpritesBatch.quad_sprites_vertex_shader = "\n\
precision highp float;\n\
attribute vec3 a_vertex;\n\
attribute vec4 a_extra4; //frame,flipx,scale,extranum\n\
attribute vec2 a_extra2;//expanse direction\n\
varying vec3 v_pos;\n\
varying vec2 v_uv;\n\
varying vec4 v_color;\n\
uniform mat4 u_model;\n\
uniform mat4 u_viewprojection;\n\
uniform vec4 u_viewport;\n\
uniform vec2 u_size;\n\
uniform vec3 u_top;\n\
uniform vec3 u_right;\n\
uniform vec4 u_color;\n\
uniform vec2 u_atlas;\n\
uniform vec2 u_itexsize;\n\
\n\
void main() {\n\
	vec3 vertex = a_vertex + a_extra4.z * u_size.y * u_top * a_extra2.y + a_extra4.z * u_size.x * u_right * a_extra2.x;\n\
	vec2 uv = a_extra2;\n\
	if( a_extra4.y != 0.0) //flip X\n\
		uv.x *= -1.0;\n\
	uv.x *= 1.0 - u_itexsize.x;\n\
	uv.y *= -1.0;\n\
	uv = uv * 0.5 + vec2(0.5);\n\
	\n\
	vec2 i_atlas = vec2(1.0) / u_atlas; \n\
	float frame = a_extra4.x;\n\
	float frame_x = mod( frame, u_atlas.x );\n\
	float frame_y = floor( frame * i_atlas.x );\n\
	uv.x = (uv.x + frame_x) * i_atlas.x;\n\
	uv.y += frame_y;\n\
	uv.y = 1.0 - uv.y * i_atlas.y;\n\
	v_uv = uv;\n\
	v_pos = (u_model * vec4(vertex,1.0)).xyz;\n\
	gl_Position = u_viewprojection * vec4(v_pos,1.0);\n\
	//gl_Position.x = floor(gl_Position.x * u_viewport.z * 1.0) / (u_viewport.z * 1.0);\n\
	//gl_Position.y = floor(gl_Position.y * u_viewport.w * 1.0) / (u_viewport.w * 1.0);\n\
}\n\
\n\
";

SpritesBatch.quad_sprites_fragment_shader = "\n\
precision highp float;\n\
precision mediump int;\n\
\n\
varying vec3 v_pos;\n\
varying vec2 v_uv;\n\
uniform vec4 u_color;\n\
uniform sampler2D u_texture;\n\
\n\
void main() {\n\
	vec4 color = texture2D( u_texture, v_uv );\n\
	if(color.a < 0.1)\n\
		discard;\n\
	color *= u_color;\n\
	gl_FragColor = color;\n\
}\n\
";

SpritesBatch.point_sprites_vertex_shader = "\n\
precision highp float;\n\
attribute vec3 a_vertex;\n\
attribute vec4 a_extra4;\n\
varying vec3 v_pos;\n\
varying vec3 v_wPos;\n\
varying vec4 v_extra4;\n\
uniform mat4 u_model;\n\
uniform mat4 u_mvp;\n\
uniform vec4 u_viewport;\n\
uniform float u_camera_perspective;\n\
uniform float u_pointSize;\n\
\n\
float computePointSize( float radius, float w )\n\
{\n\
	if(radius < 0.0)\n\
		return -radius;\n\
	return u_viewport.w * u_camera_perspective * radius / w;\n\
}\n\
\n\
void main() {\n\
	vec3 vertex = a_vertex;	\n\
	v_pos = vertex;\n\
	v_wPos = (u_model * vec4(vertex,1.0)).xyz;\n\
	v_extra4 = a_extra4;\n\
	gl_Position = u_mvp * vec4(vertex,1.0);\n\
	gl_Position.x = floor(gl_Position.x * u_viewport.z) / u_viewport.z;\n\
	gl_Position.y = floor(gl_Position.y * u_viewport.w) / u_viewport.w;\n\
	gl_PointSize = computePointSize( u_pointSize * u_extra4.z, gl_Position.w );\n\
}\n\
";

SpritesBatch.point_sprites_fragment_shader = "\n\
precision highp float;\n\
varying vec3 v_pos;\n\
varying vec3 v_wPos;\n\
varying vec4 v_extra4; //id,flip,scale,extra\n\
uniform float u_atlas;\n\
\n\
uniform sampler2D u_texture;\n\
\n\
void main() {\n\
	float i_atlas = 1.0 / u_atlas;\n\
	float frame = v_extra4.x;\n\
	float x = frame * i_atlas;\n\
	float y = floor(x);\n\
	x = (x - y);\n\
	y = y / u_atlas;\n\
	if( v_extra4.y > 0.0 ) //must flip in x\n\
		x -= gl_PointCoord.x * i_atlas - i_atlas;\n\
	else\n\
		x += gl_PointCoord.x * i_atlas;\n\
	\n\
	vec2 uv = vec2( x, 1.0 - (y + gl_PointCoord.y / u_atlas) );\n\
	vec4 color = texture2D( u_texture, uv );\n\
	if(color.a < 0.1)\n\
		discard;\n\
	gl_FragColor = color;\n\
}\n\
";
*/

//footer
})( typeof(window) != "undefined" ? window : (typeof(self) != "undefined" ? self : global ) );
