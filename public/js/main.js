$(document).ready(function(){
    $('#image').on('change', function(){
        $('#imagepreview').attr('src', window.URL.createObjectURL(this.files[0]))

    })

    $('#deleteimage').on('click', function(){
        var id = $(this).attr('data-id');
        $.ajax({
            url: '/images/' + id,
            type: 'DELETE',
            success: function(result) {
                result = JSON.parse(result);
                alert(result.message);
                if(result.hasOwnProperty('success'))
                {
                    window.location.replace("/");
                }
            }
        });
    })



    //button behaviour:
    //unclicked: shows edit
    //clicked: changes to textboxes and becomes 'submit changes' button
    $('#editimage').data('clicked', false);
    $('#editimage').on('click', function(){
        if($(this).data('clicked') == false)
        {
            $('.editable').each(function(e){
               var text = $(this).text();
               var id = $(this).attr('id');
               $(this).html('<input type="text" name="' + id + '" class="form-control" value="' + text + '">');
            })
            $(this).text('Save Changes');
            $('#editimage').data('clicked', true);
        }
        else
        {
            var edited = {};
            var id = $(this).attr('data-id');
            //quick haxx using the id of the element as the key value
            $('.editable input').each(function(){
                var value = $(this).val();
                var key = $(this).parent().attr('id');
                edited[key] = value;
            });
            $.ajax({
                url: '/images/' + id,
                type: 'PUT',
                data: edited,
                success: function(result) {
                    result = JSON.parse(result);
                    alert(result.message);
                    if(result.hasOwnProperty('success'))
                    {
                        window.location.reload();
                    }
                }
            });
        }
    });


    $('#nextstep').on('click', function(){
        var files = $("#imagemultiple")[0].files;
        var source   = $("#imageedit-template").html();
        var template = Handlebars.compile(source);
        var context = {tags: "My New Post", character: "This is my first post!"};
        var html    = template(context);
        $('#multiimageedit').html('');
        for(var i = 0;i<files.length;i++)
        {
          $('#multiimageedit').append(
            template({
              character: $('#character').val(),
              emotion: $('#emotion').val(),
              tags: $('#tags').val(),
              text: $('#text').val(),
              comments: $('#comments').val(),
              imageurl: window.URL.createObjectURL(files[i])
            })
          );
        }
        $('#multiimageedit').append('<button name="submit" id="submit" value="Submit" type="submit" class="btn btn-info">Submit</button><br/>');
    });


    $('.img-thumbnail').on('mouseover', function(){
      $('#image-preview').attr('src', $(this).attr('data-bigsrc'))
      $('#image-preview').show()
    })
    $('.img-thumbnail').on('mouseout', function(){
      $('#image-preview').hide()
    })
})
